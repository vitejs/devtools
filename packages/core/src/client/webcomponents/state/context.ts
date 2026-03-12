import type { DevToolsRpcClient, DockClientScriptContext, DockEntryState, DockPanelStorage, DocksContext } from '@vitejs/devtools-kit/client'
import type { SharedState } from '@vitejs/devtools-kit/utils/shared-state'
import type { Ref } from 'vue'
import type { DevToolsDocksUserSettings } from './dock-settings'
import { DEFAULT_STATE_USER_SETTINGS } from '@vitejs/devtools-kit/constants'
import { computed, markRaw, reactive, ref, toRefs, watchEffect } from 'vue'
import { BUILTIN_ENTRIES } from '../constants'
import { docksGroupByCategories } from './dock-settings'
import { createDockEntryState, DEFAULT_DOCK_PANEL_STORE, sharedStateToRef, useDocksEntries } from './docks'
import { createClientLogsClient } from './logs-client'
import { registerMainFrameDockActionHandler, requestDockPopupOpen, triggerMainFrameDockAction } from './popup'
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
    if (id === '~popup') {
      requestDockPopupOpen(docksContext)
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
  const groupedEntries = computed(() => {
    return docksGroupByCategories(dockEntries.value, settings.value)
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
