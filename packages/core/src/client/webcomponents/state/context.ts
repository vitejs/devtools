import type { DevToolsClientCommand, DevToolsDockEntry, DevToolsDockUserEntry, DevToolsRpcClientFunctions } from '@vitejs/devtools-kit'
import type { CommandsContext, DevToolsRpcClient, DockClientScriptContext, DockEntryState, DockPanelStorage, DockRegistration, DocksContext } from '@vitejs/devtools-kit/client'
import type { SharedState } from 'devframe/utils/shared-state'
import type { WhenContext } from 'devframe/utils/when'
import type { Ref } from 'vue'
import type { DevToolsDocksUserSettings } from './dock-settings'
import { DEFAULT_STATE_USER_SETTINGS } from '@vitejs/devtools-kit/constants'
import { computed, markRaw, reactive, ref, toRefs, watchEffect } from 'vue'
import { BUILTIN_ENTRIES } from '../constants'
import { createCommandsContext } from './commands'
import { docksGroupByCategories, getCategoryLabel, getGroupMembers, getGroupMembersGrouped, getRegisteredGroupIds, resolveCommandIcon } from './dock-settings'
import { createDockEntryState, DEFAULT_DOCK_PANEL_STORE, sharedStateToRef, useDocksEntries } from './docks'
import { createClientMessagesClient } from './messages-client'
import { registerMainFrameDockActionHandler, triggerMainFrameDockAction } from './popup'
import { createDockRenderers } from './renderers'
import { executeSetupScript } from './setup-script'

const docksContextByRpc = new WeakMap<DevToolsRpcClient, DocksContext>()
export async function createDocksContext(
  clientType: 'embedded' | 'standalone',
  rpc: DevToolsRpcClient,
  panelStore?: Ref<DockPanelStorage>,
): Promise<DocksContext> {
  if (docksContextByRpc.has(rpc)) {
    return docksContextByRpc.get(rpc)!
  }

  const dockEntries = await useDocksEntries(rpc)

  // Client-only dock registry (0.7.10 `DocksEntriesContext` API). Docks
  // registered here live in this page only, merged over the server-provided
  // `devframe:docks` docks by id, and never sync to shared state. Mirrors the
  // merge semantics of `@devframes/hub`'s own client host.
  const clientDocks = reactive(new Map<string, DevToolsDockEntry>())
  const entries = computed<DevToolsDockEntry[]>(() => {
    const server = dockEntries.value
    if (clientDocks.size === 0)
      return server
    const seen = new Set<string>()
    const merged: DevToolsDockEntry[] = []
    for (const entry of server) {
      seen.add(entry.id)
      // a client dock sharing a server id overrides it in the local merge
      merged.push(clientDocks.get(entry.id) ?? entry)
    }
    for (const [id, entry] of clientDocks) {
      if (!seen.has(id))
        merged.push(entry)
    }
    return merged
  })

  const registerClientDock = <T extends DevToolsDockEntry>(entry: T, force = false): DockRegistration<T> => {
    if (clientDocks.has(entry.id) && !force)
      throw new Error(`[@vitejs/devtools] a client dock "${entry.id}" is already registered — pass force to overwrite`)
    clientDocks.set(entry.id, entry)
    return {
      update: (patch: Partial<T>) => {
        if (patch.id != null && patch.id !== entry.id)
          throw new Error(`[@vitejs/devtools] a client dock id is immutable ("${entry.id}")`)
        const existing = clientDocks.get(entry.id)
        if (existing)
          clientDocks.set(entry.id, { ...existing, ...patch } as DevToolsDockEntry)
      },
      dispose: () => {
        clientDocks.delete(entry.id)
      },
    }
  }
  const updateClientDock = (entry: DevToolsDockUserEntry) => {
    if (!clientDocks.has(entry.id))
      throw new Error(`[@vitejs/devtools] no client dock "${entry.id}" to update — register it first`)
    clientDocks.set(entry.id, entry as DevToolsDockEntry)
  }

  const selectedId = ref<string | null>(null)
  const selected = computed(
    () => entries.value.find(entry => entry.id === selectedId.value)
      ?? BUILTIN_ENTRIES.find(entry => entry.id === selectedId.value)
      ?? null,
  )

  const dockEntryStateMap: Map<string, DockEntryState> = reactive(new Map())
  watchEffect(() => {
    for (const entry of entries.value) {
      if (dockEntryStateMap.has(entry.id)) {
        dockEntryStateMap.get(entry.id)!.entryMeta = entry
        continue
      }
      dockEntryStateMap.set(
        entry.id,
        createDockEntryState(entry, selected),
      )
    }
  })

  panelStore ||= ref(DEFAULT_DOCK_PANEL_STORE())
  let docksContext: DocksContext

  const switchEntry = async (id: string | null = null) => {
    if (id == null) {
      selectedId.value = null
      panelStore.value.open = false
      return true
    }
    if (id === '~client-auth-notice') {
      selectedId.value = id
      panelStore.value.open = true
      return true
    }
    const entry = entries.value.find(e => e.id === id)
    if (!entry)
      return false

    // A group has no view of its own — resolve to the member it represents.
    // Prefer the author's `defaultChildId`, otherwise the first visible member.
    // With neither, the group is popover-only and selecting it is a no-op here
    // (the dock-bar group button opens the member popover instead).
    if (entry.type === 'group') {
      const members = getGroupMembers(entries.value, entry.id)
      const target = (entry.defaultChildId && members.some(m => m.id === entry.defaultChildId))
        ? entry.defaultChildId
        : members[0]?.id
      if (!target)
        return false
      return switchEntry(target)
    }

    // If the action is in a popup, delegate to the main frame
    if (entry.type === 'action') {
      const delegated = await triggerMainFrameDockAction(clientType, entry.id)
      if (delegated != null)
        return false
    }

    // If has import script, run it
    if (
      (entry.type === 'action')
      || (entry.type === 'custom-render')
      || (entry.type === 'iframe' && entry.clientScript)
    ) {
      const current = dockEntryStateMap.get(id)!
      const messagesClient = createClientMessagesClient(rpc)
      const scriptContext: DockClientScriptContext = reactive({
        ...toRefs(docksContext) as any,
        current,
        messages: messagesClient,
        logs: messagesClient,
      })
      await executeSetupScript(entry, scriptContext)
    }

    selectedId.value = entry.id
    panelStore.value.open = true
    return true
  }

  const toggleEntry = async (id: string) => {
    if (selectedId.value === id)
      return switchEntry(null)
    return switchEntry(id)
  }

  // Honor cross-iframe dock-activation requests (devframe 0.7.3). A mounted
  // plugin — or our own launcher's "View in Terminal" action — calls the
  // `hub:docks:activate` RPC; the hub broadcasts `devframe:docks:activate` to
  // every client. Our shell runs its own dock machinery rather than hub's
  // client host, so we handle the broadcast here and switch the active dock
  // ourselves. The target dock (e.g. Terminals) reads `activation.params` to
  // focus a specific session.
  rpc.client.register({
    name: 'devframe:docks:activate' satisfies keyof DevToolsRpcClientFunctions,
    type: 'action',
    handler: (activation: { dockId: string, params?: Record<string, unknown> }) => {
      if (activation?.dockId)
        switchEntry(activation.dockId)
    },
  })

  let _settingsStorePromise: Promise<SharedState<DevToolsDocksUserSettings>> | undefined
  const getSettingsStore = async () => {
    if (!_settingsStorePromise) {
      _settingsStorePromise = rpc.sharedState.get(
        'devframe:user-settings',
        { initialValue: DEFAULT_STATE_USER_SETTINGS() },
      )
    }
    return _settingsStorePromise
  }

  // Get settings store and create computed grouped entries
  const settingsStore = markRaw(await getSettingsStore())
  const settings = sharedStateToRef(settingsStore)

  // Shared when-context provider — used by both commands and docks
  let commandsContext: CommandsContext
  const getWhenContext = (): WhenContext => ({
    clientType,
    dockOpen: panelStore.value.open,
    paletteOpen: commandsContext?.paletteOpen ?? false,
    dockSelectedId: selectedId.value ?? '',
  })

  const groupedEntries = computed(() => {
    return docksGroupByCategories(entries.value, settings.value, { whenContext: getWhenContext(), collapseGroups: true })
  })

  // Initialize commands context with reactive when-context
  const commandsContextResult = await createCommandsContext(clientType, rpc, settingsStore, getWhenContext)
  commandsContext = commandsContextResult

  // Register built-in client commands
  commandsContext.register([
    {
      id: 'devtools:toggle-palette',
      source: 'client',
      title: 'Toggle Command Palette',
      icon: 'ph:magnifying-glass-duotone',
      showInPalette: false,
      keybindings: [{ key: 'Mod+K' }],
      action: () => {
        commandsContext.paletteOpen = !commandsContext.paletteOpen
      },
    },
    {
      id: 'devtools:close-panel',
      source: 'client',
      title: 'Close Panel',
      icon: 'ph:x-circle-duotone',
      when: 'dockOpen && !paletteOpen',
      keybindings: [{ key: 'Escape' }],
      action: () => {
        panelStore.value.open = false
        selectedId.value = null
      },
    },
    {
      id: 'devtools:open-settings',
      source: 'client',
      title: 'Open Settings',
      icon: 'ph:gear-duotone',
      action: () => {
        switchEntry('~settings')
      },
    },
    {
      id: 'devtools:dock-mode',
      source: 'client',
      title: 'Dock Mode',
      icon: 'ph:layout-duotone',
      when: clientType === 'embedded' ? 'clientType == embedded' : undefined,
      children: [
        {
          id: 'devtools:dock-mode:float',
          source: 'client',
          title: 'Float Mode',
          icon: 'ph:cards-three-duotone',
          action: () => {
            panelStore.value.mode = 'float'
          },
        },
        {
          id: 'devtools:dock-mode:edge',
          source: 'client',
          title: 'Edge Mode',
          icon: 'ph:square-half-bottom-duotone',
          action: () => {
            panelStore.value.mode = 'edge'
          },
        },
      ],
    },
  ])

  // Dynamic dock navigation commands — grouped under "Docks" parent
  let cleanupDocksCommand: (() => void) | undefined
  watchEffect(() => {
    cleanupDocksCommand?.()

    const toCommand = (entry: DevToolsDockEntry): DevToolsClientCommand => ({
      id: `devtools:docks:${entry.id}`,
      source: 'client' as const,
      title: entry.title,
      icon: resolveCommandIcon(entry.icon),
      action: () => {
        toggleEntry(entry.id)
      },
    })

    // Mirror the dock-bar collapse in the palette: members nest under their
    // group's command, and grouped members drop out of the top level.
    const registeredGroupIds = getRegisteredGroupIds(entries.value)
    const dockChildren: DevToolsClientCommand[] = entries.value
      .filter(entry => entry.type !== '~builtin')
      .filter(entry => !(entry.groupId && registeredGroupIds.has(entry.groupId)))
      .map((entry) => {
        if (entry.type !== 'group')
          return toCommand(entry)
        // Members nest under the group, split by their in-group sub-category.
        // A single sub-category (the common case) is flattened directly so the
        // palette doesn't add a pointless one-item drill-down level.
        const memberGroups = getGroupMembersGrouped(entries.value, entry.id, settings.value, { whenContext: getWhenContext() })
        const children: DevToolsClientCommand[] = memberGroups.length <= 1
          ? (memberGroups[0]?.[1] ?? []).map(toCommand)
          : memberGroups.map(([category, members]) => ({
              id: `devtools:docks:${entry.id}:cat:${category}`,
              source: 'client' as const,
              title: getCategoryLabel(category),
              children: members.map(toCommand),
            }))
        return {
          ...toCommand(entry),
          children,
        }
      })

    if (dockChildren.length > 0) {
      cleanupDocksCommand = commandsContext.register({
        id: 'devtools:docks',
        source: 'client',
        title: 'Docks',
        icon: 'ph:layout-duotone',
        children: dockChildren,
      })
    }
  })

  docksContext = reactive({
    panel: {
      store: panelStore,
      isDragging: false,
      isResizing: false,
      isVertical: computed(() => panelStore.value.position === 'left' || panelStore.value.position === 'right'),
    },
    docks: {
      selectedId,
      selected,
      entries,
      entryToStateMap: markRaw(dockEntryStateMap),
      groupedEntries,
      settings: settingsStore,
      getStateById: (id: string) => dockEntryStateMap.get(id),
      switchEntry,
      toggleEntry,
      register: registerClientDock,
      update: updateClientDock,
    },
    commands: commandsContext,
    when: {
      get context() {
        return getWhenContext()
      },
    },
    connection: {
      get status() {
        return rpc.status
      },
      get error() {
        return rpc.connectionError
      },
      events: rpc.events,
    },
    renderers: markRaw(createDockRenderers(() => docksContext)),
    rpc: markRaw(rpc),
    clientType,
  })

  registerMainFrameDockActionHandler(clientType, async (id) => {
    const entry = entries.value.find(e => e.id === id)
    if (!entry || entry.type !== 'action')
      return false
    return switchEntry(entry.id)
  })

  docksContextByRpc.set(rpc, docksContext)
  return docksContext
}
