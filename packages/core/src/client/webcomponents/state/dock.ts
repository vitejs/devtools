import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DevToolsRpcClient, DockEntryState, DockPanelStorage, DocksContext } from '@vitejs/devtools-kit/client'
import type { Ref } from 'vue'
import { computed, reactive, ref, shallowRef } from 'vue'

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

export async function createDocksContext(
  clientType: 'embedded' | 'standalone',
  rpc: DevToolsRpcClient,
  panelStore?: Ref<DockPanelStorage>,
): Promise<DocksContext> {
  const selected = ref<DevToolsDockEntry | null>(null)
  const dockEntries = shallowRef((await rpc['vite:core:list-dock-entries']()).map(entry => Object.freeze(entry)))
  // eslint-disable-next-line no-console
  console.log('[VITE DEVTOOLS] Docks Entries', [...dockEntries.value])
  // TODO: get board case from rpc when entries updates
  const dockEntryStateMap = reactive(new Map<string, DockEntryState>())
  for (const entry of dockEntries.value) {
    dockEntryStateMap.set(
      entry.id,
      reactive({
        entryMeta: entry,
        get isActive() {
          return selected.value?.id === entry.id
        },
        domElements: {},
      }),
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
      entryToStateMap: dockEntryStateMap,
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
    rpc,
    clientType,
  })
}
