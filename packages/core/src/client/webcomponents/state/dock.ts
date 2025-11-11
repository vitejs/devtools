import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { ClientRpcReturn, DockEntryState, DockEntryStateEvents, DockPanelStorage, DocksContext } from '@vitejs/devtools-kit/client'
import type { Ref } from 'vue'
import { createNanoEvents } from 'nanoevents'
import { computed, markRaw, reactive, ref, shallowRef, watch } from 'vue'

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
  const events = createNanoEvents<DockEntryStateEvents>()
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

export async function createDocksContext(
  clientType: 'embedded' | 'standalone',
  rpcReturn: ClientRpcReturn,
  panelStore?: Ref<DockPanelStorage>,
): Promise<DocksContext> {
  const selected = ref<DevToolsDockEntry | null>(null)
  const dockEntries = shallowRef((await rpcReturn.rpc.$call('vite:core:list-dock-entries')).map(entry => Object.freeze(entry)))
  // eslint-disable-next-line no-console
  console.log('[VITE DEVTOOLS] Docks Entries', [...dockEntries.value])
  // TODO: get board case from rpc when entries updates
  const dockEntryStateMap: Map<string, DockEntryState> = reactive(new Map())
  for (const entry of dockEntries.value) {
    // TODO: handle update
    dockEntryStateMap.set(
      entry.id,
      createDockEntryState(entry, selected),
    )
  }

  panelStore ||= ref(DEFAULT_DOCK_PANEL_STORE())

  return reactive({
    panel: {
      store: panelStore,
      isDragging: false,
      isResizing: false,
      isVertical: computed(() => panelStore.value.position === 'left' || panelStore.value.position === 'right'),
    },
    docks: {
      selected,
      entries: dockEntries.value,
      entryToStateMap: markRaw(dockEntryStateMap),
      getStateById: (id: string) => dockEntryStateMap.get(id),
      switchEntry: async (id: string | null) => {
        if (id === null) {
          selected.value = null
          return true
        }
        const entry = dockEntries.value.find(e => e.id === id)
        if (!entry)
          return false
        selected.value = entry
        // TODO: run action
        return true
      },
    },
    rpc: rpcReturn.rpc,
    clientRpc: rpcReturn.clientRpc,
    clientType,
  })
}
