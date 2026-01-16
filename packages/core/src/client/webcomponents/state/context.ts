import type { DevToolsRpcClient, DockClientScriptContext, DockEntryState, DockPanelStorage, DocksContext } from '@vitejs/devtools-kit/client'
import type { SharedState } from '@vitejs/devtools-kit/utils/shared-state'
import type { Ref } from 'vue'
import type { DevToolsDocksUserSettings } from './dock-settings'
import { DEFAULT_STATE_DOCKS_SETTINGS } from '@vitejs/devtools-kit/constants'
import { computed, markRaw, reactive, ref, toRefs, watchEffect } from 'vue'
import { BUILTIN_ENTRIES } from '../constants'
import { docksGroupByCategories } from './dock-settings'
import { createDockEntryState, DEFAULT_DOCK_PANEL_STORE, useDocksEntries } from './docks'
import { executeSetupScript } from './setup-script'

let _docksContext: DocksContext | undefined
export async function createDocksContext(
  clientType: 'embedded' | 'standalone',
  rpc: DevToolsRpcClient,
  panelStore?: Ref<DockPanelStorage>,
): Promise<DocksContext> {
  if (_docksContext) {
    return _docksContext
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

    // If has import script, run it
    if (
      (entry.type === 'action')
      || (entry.type === 'custom-render')
      || (entry.type === 'iframe' && entry.clientScript)
    ) {
      const current = dockEntryStateMap.get(id)!
      const scriptContext: DockClientScriptContext = reactive({
        ...toRefs(_docksContext!) as any,
        current,
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
        { initialValue: DEFAULT_STATE_DOCKS_SETTINGS() },
      )
    }
    return _settingsStorePromise
  }

  // Get settings store and create computed grouped entries
  const settingsStore = markRaw(await getSettingsStore())
  const groupedEntries = computed(() => {
    return docksGroupByCategories(dockEntries.value, settingsStore.value())
  })

  _docksContext = reactive({
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

  return _docksContext!
}
