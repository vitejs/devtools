import type { DevToolsDockEntry, DevToolsRpcClientFunctions } from '@vitejs/devtools-kit'
import type { DevToolsRpcClient, DockEntryState, DockEntryStateEvents, DockPanelStorage } from '@vitejs/devtools-kit/client'
import type { Ref, ShallowRef } from 'vue'
import { createEventEmitter } from '@vitejs/devtools-kit/utils/events'
import { markRaw, reactive, shallowRef, watch } from 'vue'

export function DEFAULT_DOCK_PANEL_STORE(): DockPanelStorage {
  return {
    width: 80,
    height: 80,
    top: 0,
    left: 10,
    position: 'bottom',
    open: false,
    inactiveTimeout: 3_000,
  }
}

export function createDockEntryState(
  entry: DevToolsDockEntry,
  selected: Ref<DevToolsDockEntry | null>,
): DockEntryState {
  const events = createEventEmitter<DockEntryStateEvents>()
  const state: DockEntryState = reactive({
    entryMeta: entry,
    get isActive() {
      return selected.value?.id === entry.id
    },
    domElements: {},
    events: markRaw(events),
  })

  watch(
    () => selected.value?.id,
    (newSelectedId) => {
      if (newSelectedId === entry.id) {
        events.emit('entry:activated')
      }
      else {
        events.emit('entry:deactivated')
      }
    },
    { immediate: true },
  )

  watch(
    () => state.domElements.iframe,
    (newIframe) => {
      if (newIframe)
        events.emit('dom:iframe:mounted', newIframe)
    },
    { immediate: true },
  )

  watch(
    () => state.domElements.panel,
    (newPanel) => {
      if (newPanel)
        events.emit('dom:panel:mounted', newPanel)
    },
    { immediate: true },
  )

  return state
}

let _docksEntriesRef: ShallowRef<DevToolsDockEntry[]> | undefined
export async function useDocksEntries(rpc: DevToolsRpcClient): Promise<Ref<DevToolsDockEntry[]>> {
  if (_docksEntriesRef) {
    return _docksEntriesRef
  }
  const dockEntries = _docksEntriesRef = shallowRef<DevToolsDockEntry[]>([])
  async function updateDocksEntries() {
    if (!rpc.isTrusted) {
      console.warn('[VITE DEVTOOLS] Untrusted client, skipping docks entries update')
      return
    }
    dockEntries.value = (await rpc.call('vite:internal:docks:list'))
      .map(entry => Object.freeze(entry))
    // eslint-disable-next-line no-console
    console.log('[VITE DEVTOOLS] Docks Entries Updated', [...dockEntries.value])
  }
  rpc.events.on('rpc:is-trusted:updated', (isTrusted) => {
    if (isTrusted)
      updateDocksEntries()
  })
  rpc.client.register({
    name: 'vite:internal:docks:updated' satisfies keyof DevToolsRpcClientFunctions,
    type: 'action',
    handler: () => updateDocksEntries(),
  })
  await updateDocksEntries()
  return dockEntries
}
