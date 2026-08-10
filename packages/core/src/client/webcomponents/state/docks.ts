import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DevToolsRpcClient, DockEntryState, DockEntryStateEvents, DockPanelStorage } from '@vitejs/devtools-kit/client'
import type { SharedState } from 'devframe/utils/shared-state'
import type { Ref, ShallowRef } from 'vue'
import { createEventEmitter } from 'devframe/utils/events'
import { markRaw, reactive, shallowRef, watch } from 'vue'

/**
 * {@link DockPanelStorage} (hub's own type — geometry/mode/`open`) plus
 * `selectedId`, which the hub has no concept of. Both persist the same way:
 * one `vite-devtools-dock-state` localStorage value, cross-tab like
 * everything else in it already is — a dock left open/selected in one tab
 * shows the same way in the next, exactly as `open` already behaves today.
 */
export interface DevToolsDockPanelStorage extends DockPanelStorage {
  selectedId: string | null
}

export function DEFAULT_DOCK_PANEL_STORE(): DevToolsDockPanelStorage {
  return {
    mode: 'float',
    width: 80,
    height: 80,
    top: 0,
    left: 10,
    position: 'bottom',
    open: false,
    inactiveTimeout: 3_000,
    selectedId: null,
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

const docksEntriesRefByRpc = new WeakMap<DevToolsRpcClient, ShallowRef<DevToolsDockEntry[]>>()
export async function useDocksEntries(rpc: DevToolsRpcClient): Promise<Ref<DevToolsDockEntry[]>> {
  if (docksEntriesRefByRpc.has(rpc)) {
    return docksEntriesRefByRpc.get(rpc)!
  }
  const state = await rpc.sharedState.get('devframe:docks', { initialValue: [] })
  const docksEntriesRef = sharedStateToRef(state)
  docksEntriesRefByRpc.set(rpc, docksEntriesRef)
  return docksEntriesRef
}
