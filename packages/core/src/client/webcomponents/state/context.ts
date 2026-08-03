import type { DevToolsClientCommand, DevToolsDockEntry, DevToolsDockUserEntry, DevToolsRpcClientFunctions, DevToolsViewIframe } from '@vitejs/devtools-kit'
import type { CommandsContext, DevToolsRpcClient, DockClientScriptContext, DockEntryState, DockPanelStorage, DockRegistration, DocksContext } from '@vitejs/devtools-kit/client'
import type { SharedState } from 'devframe/utils/shared-state'
import type { WhenContext } from 'devframe/utils/when'
import type { Ref } from 'vue'
import type { DevToolsDocksUserSettings } from './dock-settings'
import { attachDevToolsFrameNav } from '@vitejs/devtools-kit/client'
import { DEFAULT_STATE_USER_SETTINGS, DEVTOOLS_MOUNT_PATH } from '@vitejs/devtools-kit/constants'
import { computed, markRaw, reactive, ref, toRefs, watch, watchEffect } from 'vue'
import { DEVTOOLS_HIDE_EVENT, DEVTOOLS_MODE_FILENAME } from '../../../constants'
import { BUILTIN_ENTRIES } from '../constants'
import { resolveDockIcon } from '../utils/dock-icon'
import { getRpcConnectionOrigin } from '../utils/iframe-url'
import { createCommandsContext } from './commands'
import { docksGroupByCategories, getCategoryLabel, getGroupMembers, getGroupMembersGrouped, getRegisteredGroupIds, resolveCommandIcon, resolveGroupDefaultChild } from './dock-settings'
import { createDockEntryState, DEFAULT_DOCK_PANEL_STORE, sharedStateToRef, useDocksEntries } from './docks'
import { createClientMessagesClient } from './messages-client'
import { registerMainFrameDockActionHandler, triggerMainFrameDockAction, useIsDockPopupOpen } from './popup'
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
  const connectionOrigin = getRpcConnectionOrigin(rpc)
  const resolveEntryIcon = <T extends DevToolsDockEntry>(entry: T): T => ({
    ...entry,
    icon: resolveDockIcon(entry.icon, connectionOrigin),
  })

  // Client-only dock registry (0.7.10 `DocksEntriesContext` API). Docks
  // registered here live in this page only, merged over the server-provided
  // `devframe:docks` docks by id, and never sync to shared state. Mirrors the
  // merge semantics of `@devframes/hub`'s own client host.
  const clientDocks = reactive(new Map<string, DevToolsDockEntry>())
  const entries = computed<DevToolsDockEntry[]>(() => {
    const server = dockEntries.value.map(resolveEntryIcon)
    if (clientDocks.size === 0)
      return server
    const seen = new Set<string>()
    const merged: DevToolsDockEntry[] = []
    for (const entry of server) {
      seen.add(entry.id)
      // a client dock sharing a server id overrides it in the local merge
      merged.push(resolveEntryIcon(clientDocks.get(entry.id) ?? entry))
    }
    for (const [id, entry] of clientDocks) {
      if (!seen.has(id))
        merged.push(resolveEntryIcon(entry))
    }
    return merged
  })

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

  const registerClientDock = <T extends DevToolsDockEntry>(entry: T, force = false): DockRegistration<T> => {
    if (clientDocks.has(entry.id) && !force)
      throw new Error(`[@vitejs/devtools] a client dock "${entry.id}" is already registered — pass force to overwrite`)
    clientDocks.set(entry.id, entry)
    // Eagerly materialize the entry's DockEntryState. The reactive watchEffect
    // above only creates states on its next flush, but a caller such as the
    // shared-iframe frame-nav adapter subscribes to `entry:activated` (via
    // `getStateById`) synchronously right after registering — so the state has
    // to exist immediately, mirroring hub's synchronous client-host reconcile.
    if (!dockEntryStateMap.has(entry.id))
      dockEntryStateMap.set(entry.id, createDockEntryState(entry, selected))
    return {
      update: (patch: Partial<T>) => {
        if (patch.id != null && patch.id !== entry.id)
          throw new Error(`[@vitejs/devtools] a client dock id is immutable ("${entry.id}")`)
        const existing = clientDocks.get(entry.id)
        if (existing)
          clientDocks.set(entry.id, { ...existing, ...patch } as DevToolsDockEntry)
      },
      dispose: () => {
        if (!clientDocks.delete(entry.id))
          return
        dockEntryStateMap.delete(entry.id)
        // Clearing the selection when the active member vanishes matches the
        // hub reconcile behavior for a removed selected entry (shared-iframe
        // soft-nav §7.5).
        if (selectedId.value === entry.id)
          selectedId.value = null
      },
    }
  }
  const updateClientDock = (entry: DevToolsDockUserEntry) => {
    if (!clientDocks.has(entry.id))
      throw new Error(`[@vitejs/devtools] no client dock "${entry.id}" to update — register it first`)
    clientDocks.set(entry.id, entry as DevToolsDockEntry)
  }

  panelStore ||= ref(DEFAULT_DOCK_PANEL_STORE())
  let docksContext: DocksContext

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

  // Get settings store ahead of `switchEntry` — its group→member resolution
  // needs `getWhenContext` to honor a `defaultChildId` target's `when` clause.
  const settingsStore = markRaw(await getSettingsStore())
  const settings = sharedStateToRef(settingsStore)

  // Shared when-context provider — used by both commands and docks
  let commandsContext: CommandsContext
  const isDockPopupOpen = useIsDockPopupOpen()
  const getWhenContext = (): WhenContext => ({
    clientType,
    dockOpen: panelStore.value.open,
    paletteOpen: commandsContext?.paletteOpen ?? false,
    dockSelectedId: selectedId.value ?? '',
    popupOpen: isDockPopupOpen.value,
  })

  // Tracks the shared frame's current member tab, keyed by `frameId`. A
  // `subTabs` anchor boots a shared iframe but has no view distinct from its
  // synthesized member tabs (they all render the same frame), and it is usually
  // hidden from the bar via `visibility: 'false'`. Remembering which member is
  // live lets `switchEntry` redirect a later re-selection of the anchor (e.g. a
  // group `defaultChildId` reopening the group) onto that visible tab instead of
  // lingering on the invisible anchor. Populated below whenever a member is
  // selected; read when a `subTabs` anchor is selected.
  const frameNavCurrentMember = new Map<string, string>()

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
    // Prefer the author's `defaultChildId` (honoring its `when` clause but
    // ignoring its render-only `visibility` — see `resolveGroupDefaultChild`),
    // otherwise the first member. With neither, the group is popover-only and
    // selecting it is a no-op here (the dock-bar group button opens the
    // member popover instead).
    if (entry.type === 'group') {
      const target = resolveGroupDefaultChild(entries.value, entry.id, entry.defaultChildId, getWhenContext())?.id
        ?? getGroupMembers(entries.value, entry.id)[0]?.id
      if (!target)
        return false
      return switchEntry(target)
    }

    // A `subTabs` anchor owns the shared frame but has no view of its own apart
    // from its synthesized member tabs, and is usually hidden from the bar
    // (`visibility: 'false'`). Once the frame has reported a current tab,
    // selecting the anchor — via a group `defaultChildId` boot, the command
    // palette, or an RPC activation — redirects to that live member so a visible
    // dock is highlighted instead of the invisible anchor. Before any tab exists
    // (first boot) there is no current member, so we fall through and select the
    // anchor itself to mount its iframe and boot the frame.
    if (entry.type === 'iframe' && entry.subTabs) {
      const frameId = entry.frameId ?? entry.id
      const currentMemberId = frameNavCurrentMember.get(frameId)
      if (currentMemberId && currentMemberId !== id && entries.value.some(e => e.id === currentMemberId))
        return switchEntry(currentMemberId)
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

    // Remember the shared frame's current member tab (a member carries its
    // anchor's `frameId` but is not itself a `subTabs` anchor) so re-selecting
    // the usually-hidden anchor later lands back on this visible tab.
    if (entry.type === 'iframe' && entry.frameId && !entry.subTabs)
      frameNavCurrentMember.set(entry.frameId, entry.id)

    selectedId.value = entry.id
    panelStore.value.open = true
    return true
  }

  const toggleEntry = async (id: string) => {
    if (selectedId.value === id)
      return switchEntry(null)
    return switchEntry(id)
  }

  // Shared-iframe soft navigation (devframe 0.7.11). An iframe dock flagged
  // `subTabs` is an *anchor* that owns one live iframe (its `frameId`); the
  // embedded app ships a small `postMessage` nav shim. When the anchor's iframe
  // mounts we attach the hub-shipped frame-nav adapter, which runs the ready
  // handshake, turns the reported tab manifest into client-only member docks,
  // and drives the bidirectional nav loop (selecting a member soft-navigates
  // the shared frame; the app's `navigated` report moves the dock highlight).
  //
  // Our shell runs its own dock machinery instead of hub's `createDevframeClientHost`,
  // so we replicate the host's `maybeAttachFrameNav`: one adapter per `frameId`,
  // torn down when the anchor is removed.
  //
  // The adapter is bound to a *mounted iframe element*, not just to the `frameId`.
  // Each dock shell (float, edge, popup) owns its own `IframePanes` manager and
  // creates panes in its own document, so switching shells hands us a different
  // iframe in a different realm — the old adapter is disposed and a fresh one
  // attached. For the same reason the adapter must listen on the iframe's own
  // window: in popup mode the frame lives in a Document-PiP document and posts
  // its handshake to *that* window, not to the main one.
  const frameNavAdapters = new Map<string, { iframe: HTMLIFrameElement, dispose: () => void }>()
  const frameNavAnchors = new Map<string, string>()

  const attachFrameNav = (anchor: DevToolsViewIframe, state: DockEntryState) => {
    const frameId = anchor.frameId ?? anchor.id
    const start = (iframe: HTMLIFrameElement) => {
      const existing = frameNavAdapters.get(frameId)
      if (existing) {
        if (existing.iframe === iframe)
          return
        existing.dispose()
        frameNavAdapters.delete(frameId)
      }
      const adapter = attachDevToolsFrameNav({
        frameId,
        anchor,
        iframe,
        window: iframe.ownerDocument?.defaultView ?? globalThis,
        docks: {
          register: registerClientDock,
          switchEntry,
          getStateById: (id: string) => dockEntryStateMap.get(id),
        },
      })
      frameNavAdapters.set(frameId, { iframe, dispose: adapter.dispose })
    }
    if (state.domElements.iframe)
      start(state.domElements.iframe)
    state.events.on('dom:iframe:mounted', start)
  }

  watch(
    entries,
    (list) => {
      const seen = new Set<string>()
      for (const meta of list) {
        if (meta.type !== 'iframe' || !meta.subTabs)
          continue
        seen.add(meta.id)
        if (frameNavAnchors.has(meta.id))
          continue
        const state = dockEntryStateMap.get(meta.id)
        if (!state)
          continue
        frameNavAnchors.set(meta.id, meta.frameId ?? meta.id)
        attachFrameNav(meta, state)
      }
      // An anchor that disappeared tears down its adapter, which disposes every
      // member dock it registered and detaches the `postMessage` listener.
      for (const [anchorId, frameId] of [...frameNavAnchors]) {
        if (seen.has(anchorId))
          continue
        frameNavAnchors.delete(anchorId)
        frameNavAdapters.get(frameId)?.dispose()
        frameNavAdapters.delete(frameId)
      }
    },
    { immediate: true },
  )

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

  // Settings store, `settings`, and `getWhenContext` are established earlier
  // (right before `switchEntry`) — its group→member resolution needs them.
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
      id: 'devtools:hide',
      source: 'client',
      title: 'Hide DevTools (Passive Mode)',
      icon: 'ph:eye-slash-duotone',
      // Only the injected overlay can go passive; the standalone page is an
      // explicit visit and stays mounted.
      when: 'clientType == embedded',
      action: async () => {
        // Clear the persisted "normal mode" flag, then ask the inject-side
        // lifecycle to tear the overlay down and re-arm the activation shortcut.
        try {
          await fetch(`${DEVTOOLS_MOUNT_PATH}${DEVTOOLS_MODE_FILENAME}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: false }),
          })
        }
        catch {
          // Best-effort persistence; the overlay still hides for this session.
        }
        window.dispatchEvent(new CustomEvent(DEVTOOLS_HIDE_EVENT))
      },
    },
    {
      id: 'devtools:dock-mode',
      source: 'client',
      title: 'Dock Mode',
      icon: 'ph:layout-duotone',
      // While the popup is open the embedded shell is unmounted and the popup
      // renders the standalone layout, so neither mode is observable — mirrors
      // the Appearance settings hiding its own dock-mode control.
      when: clientType === 'embedded' ? 'clientType == embedded && !popupOpen' : undefined,
      children: [
        {
          id: 'devtools:dock-mode:float',
          source: 'client',
          title: 'Float Mode',
          icon: 'ph:cards-three-duotone',
          // Repeated per child: shortcut dispatch reads the matched command's
          // own `when` and does not inherit the parent's.
          when: '!popupOpen',
          action: () => {
            panelStore.value.mode = 'float'
          },
        },
        {
          id: 'devtools:dock-mode:edge',
          source: 'client',
          title: 'Edge Mode',
          icon: 'ph:square-half-bottom-duotone',
          when: '!popupOpen',
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
