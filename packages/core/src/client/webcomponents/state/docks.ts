import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DevToolsRpcClient, DockEntryState, DockEntryStateEvents, DockPanelStorage } from '@vitejs/devtools-kit/client'
import type { SharedState } from '@vitejs/devtools-kit/utils/shared-state'
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

export function sharedStateToRef<T>(sharedState: SharedState<T>): ShallowRef<T> {
  const ref = shallowRef<T>(sharedState.value() as T)
  sharedState.on('updated', (newState: T) => {
    ref.value = newState
  })
  return ref
}

let _docksEntriesRef: ShallowRef<DevToolsDockEntry[]> | undefined
export async function useDocksEntries(rpc: DevToolsRpcClient): Promise<Ref<DevToolsDockEntry[]>> {
  if (_docksEntriesRef) {
    return _docksEntriesRef
  }
  const state = await rpc.sharedState.get('devtoolskit:internal:docks', { initialValue: [] })
  _docksEntriesRef = sharedStateToRef(state)
  return _docksEntriesRef
}
