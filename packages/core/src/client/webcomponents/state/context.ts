import type { DevToolsClientCommand, WhenContext } from '@vitejs/devtools-kit'
import type { CommandsContext, DevToolsRpcClient, DockClientScriptContext, DockEntryState, DockPanelStorage, DocksContext } from '@vitejs/devtools-kit/client'
import type { SharedState } from '@vitejs/devtools-kit/utils/shared-state'
import type { Ref } from 'vue'
import type { DevToolsDocksUserSettings } from './dock-settings'
import { DEFAULT_STATE_USER_SETTINGS } from '@vitejs/devtools-kit/constants'
import { computed, markRaw, reactive, ref, toRefs, watchEffect } from 'vue'
import { BUILTIN_ENTRIES } from '../constants'
import { createCommandsContext } from './commands'
import { docksGroupByCategories } from './dock-settings'
import { createDockEntryState, DEFAULT_DOCK_PANEL_STORE, sharedStateToRef, useDocksEntries } from './docks'
import { createClientLogsClient } from './logs-client'
import { registerMainFrameDockActionHandler, triggerMainFrameDockAction } from './popup'
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
  const selectedId = ref<string | null>(null)
  const selected = computed(
    () => dockEntries.value.find(entry => entry.id === selectedId.value)
      ?? BUILTIN_ENTRIES.find(entry => entry.id === selectedId.value)
      ?? null,
  )

  const dockEntryStateMap: Map<string, DockEntryState> = reactive(new Map())
  watchEffect(() => {
    for (const entry of dockEntries.value) {
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
      return true
    }
    if (id === '~client-auth-notice') {
      selectedId.value = id
      panelStore.value.open = true
      return true
    }
    const entry = dockEntries.value.find(e => e.id === id)
    if (!entry)
      return false

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
      const scriptContext: DockClientScriptContext = reactive({
        ...toRefs(docksContext) as any,
        current,
        logs: createClientLogsClient(rpc),
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

  let _settingsStorePromise: Promise<SharedState<DevToolsDocksUserSettings>> | undefined
  const getSettingsStore = async () => {
    if (!_settingsStorePromise) {
      _settingsStorePromise = rpc.sharedState.get(
        'devtoolskit:internal:user-settings',
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
    return docksGroupByCategories(dockEntries.value, settings.value, { whenContext: getWhenContext() })
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

    const dockChildren: DevToolsClientCommand[] = dockEntries.value
      .filter(entry => entry.type !== '~builtin')
      .map((entry) => {
        return {
          id: `devtools:docks:${entry.id}`,
          source: 'client' as const,
          title: entry.title,
          icon: typeof entry.icon === 'string' ? entry.icon : undefined,
          action: () => {
            toggleEntry(entry.id)
          },
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
      entries: dockEntries,
      entryToStateMap: markRaw(dockEntryStateMap),
      groupedEntries,
      settings: settingsStore,
      getStateById: (id: string) => dockEntryStateMap.get(id),
      switchEntry,
      toggleEntry,
    },
    commands: commandsContext,
    when: {
      get context() {
        return getWhenContext()
      },
    },
    rpc,
    clientType,
  })

  registerMainFrameDockActionHandler(clientType, async (id) => {
    const entry = dockEntries.value.find(e => e.id === id)
    if (!entry || entry.type !== 'action')
      return false
    return switchEntry(entry.id)
  })

  docksContextByRpc.set(rpc, docksContext)
  return docksContext
}
