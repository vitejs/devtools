import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DevToolsRpcClient } from '@vitejs/devtools-kit/client'
import type { Ref } from 'vue'
import { reactive, shallowRef } from 'vue'

export interface DockPanelState {
  width: number
  height: number
  top: number
  left: number
  position: 'left' | 'right' | 'bottom' | 'top'
  open: boolean
  minimizePanelInactive: number
}

export function DEFAULT_DOCK_PANEL_STATE(): DockPanelState {
  return {
    width: 80,
    height: 80,
    top: 0,
    left: 10,
    position: 'bottom',
    open: false,
    minimizePanelInactive: 3_000,
  }
}

export interface DockContext {
  state: DockPanelState
  isDragging: boolean
  isResizing: boolean
  dockEntries: DevToolsDockEntry[]
  rpc: DevToolsRpcClient
  clientType: 'embedded' | 'standalone'
  selected: DevToolsDockEntry | null
}

export async function createDockContext(
  clientType: 'embedded' | 'standalone',
  rpc: DevToolsRpcClient,
  state?: Ref<DockPanelState>,
): Promise<DockContext> {
  const dockEntries = shallowRef((await rpc['vite:core:list-dock-entries']()).map(entry => Object.freeze(entry)))
  // eslint-disable-next-line no-console
  console.log('[VITE DEVTOOLS] Docks Entries', [...dockEntries.value])

  return reactive({
    state: state || DEFAULT_DOCK_PANEL_STATE(),
    dockEntries,
    rpc,
    clientType,
    selected: null,
    isDragging: false,
    isResizing: false,
  })
}
