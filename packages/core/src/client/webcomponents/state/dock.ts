import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DevToolsRpcClient } from '@vitejs/devtools-kit/client'
import type { Ref } from 'vue'
import { computed, reactive, ref, shallowRef } from 'vue'

export interface DockPanelStorage {
  width: number
  height: number
  top: number
  left: number
  position: 'left' | 'right' | 'bottom' | 'top'
  open: boolean
  inactiveTimeout: number
}

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

export interface DocksContext {
  readonly clientType: 'embedded' | 'standalone'
  readonly rpc: DevToolsRpcClient
  panel: DocksPanelContext
  dockEntries: DevToolsDockEntry[]
  selected: DevToolsDockEntry | null
}

export interface DocksPanelContext {
  store: DockPanelStorage
  isDragging: boolean
  isResizing: boolean
  readonly isVertical: boolean
}

export async function createDocksContext(
  clientType: 'embedded' | 'standalone',
  rpc: DevToolsRpcClient,
  panelStore?: Ref<DockPanelStorage>,
): Promise<DocksContext> {
  const dockEntries = shallowRef((await rpc['vite:core:list-dock-entries']()).map(entry => Object.freeze(entry)))
  // eslint-disable-next-line no-console
  console.log('[VITE DEVTOOLS] Docks Entries', [...dockEntries.value])

  panelStore ||= ref(DEFAULT_DOCK_PANEL_STORE())

  return reactive({
    panel: {
      store: panelStore,
      isDragging: false,
      isResizing: false,
      isVertical: computed(() => panelStore.value.position === 'left' || panelStore.value.position === 'right'),
    },
    dockEntries,
    rpc,
    clientType,
    selected: null,
  })
}
