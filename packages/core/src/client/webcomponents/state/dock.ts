import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { ClientRpcReturn, DockEntryState, DockEntryStateEvents, DockPanelStorage, DocksContext } from '@vitejs/devtools-kit/client'
import type { Ref, ShallowRef } from 'vue'
import { createEventEmitter } from '@vitejs/devtools-kit/utils/events'
import { computed, markRaw, reactive, ref, shallowRef, watch, watchEffect } from 'vue'

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

function createDockEntryState(
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

  watch(() => selected.value?.id, (newSelectedId) => {
    if (newSelectedId === entry.id) {
      events.emit('entry:activated')
    }
    else {
      events.emit('entry:deactivated')
    }
  })

  watch(() => state.domElements.iframe, (newIframe) => {
    if (newIframe)
      events.emit('dom:iframe:mounted', newIframe)
  })

  watch(() => state.domElements.panel, (newPanel) => {
    if (newPanel)
      events.emit('dom:panel:mounted', newPanel)
  })

  return state
}

let _docksEntriesRef: ShallowRef<DevToolsDockEntry[]> | undefined
export async function useDocksEntries(rpcReturn: ClientRpcReturn): Promise<Ref<DevToolsDockEntry[]>> {
  if (_docksEntriesRef) {
    return _docksEntriesRef
  }
  const dockEntries = _docksEntriesRef = shallowRef<DevToolsDockEntry[]>([])
  async function updateDocksEntries() {
    dockEntries.value = (await rpcReturn.rpc.$call('vite:core:list-dock-entries')).map(entry => Object.freeze(entry))
    // eslint-disable-next-line no-console
    console.log('[VITE DEVTOOLS] Docks Entries Updated', [...dockEntries.value])
  }
  rpcReturn.clientRpc.register({
    name: 'vite:core:list-dock-entries:updated',
    type: 'action',
    handler: () => updateDocksEntries(),
  })
  await updateDocksEntries()
  return dockEntries
}

let _docksContext: DocksContext | undefined
export async function createDocksContext(
  clientType: 'embedded' | 'standalone',
  rpcReturn: ClientRpcReturn,
  panelStore?: Ref<DockPanelStorage>,
): Promise<DocksContext> {
  if (_docksContext) {
    return _docksContext
  }

  const selectedId = ref<string | null>(null)
  const dockEntries = await useDocksEntries(rpcReturn)
  const selected = computed(() => dockEntries.value.find(entry => entry.id === selectedId.value) ?? null)

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
      getStateById: (id: string) => dockEntryStateMap.get(id),
      switchEntry: async (id: string | null) => {
        if (id === null) {
          selectedId.value = null
          return true
        }
        const entry = dockEntries.value.find(e => e.id === id)
        if (!entry)
          return false
        selectedId.value = entry.id
        // TODO: run action
        return true
      },
    },
    rpc: rpcReturn.rpc,
    clientRpc: rpcReturn.clientRpc,
    clientType,
  })

  return _docksContext
}
