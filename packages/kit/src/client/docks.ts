import type { DevToolsDockEntry } from '../types'
import type { DevToolsRpcClient } from './rpc'

export interface DockPanelStorage {
  width: number
  height: number
  top: number
  left: number
  position: 'left' | 'right' | 'bottom' | 'top'
  open: boolean
  inactiveTimeout: number
}

export type DockClientType = 'embedded' | 'standalone'

export interface DocksContext {
  /**
   * Type of the client environment
   *
   * 'embedded' - running inside an embedded floating panel
   * 'standalone' - running inside a standlone window (no user app)
   */
  readonly clientType: 'embedded' | 'standalone'
  /**
   * The RPC client to interact with the server
   */
  readonly rpc: DevToolsRpcClient
  /**
   * The panel context
   */
  panel: DocksPanelContext
  /**
   * The docks entries context
   */
  docks: DocksEntriesContext
}

export interface DocksPanelContext {
  store: DockPanelStorage
  isDragging: boolean
  isResizing: boolean
  readonly isVertical: boolean
}

export interface DocksEntriesContext {
  selected: DevToolsDockEntry | null
  entries: DevToolsDockEntry[]
  entryToStateMap: Map<string, DockEntryState>
  /**
   * Get the state of a dock entry by its ID
   */
  getStateById: (id: string) => DockEntryState | undefined
  /**
   * Switch to the selected dock entry, pass `null` to clear the selection
   *
   * @returns Whether the selection was changed successfully
   */
  switchEntry: (id: string | null) => Promise<boolean>
}

export interface DockEntryState {
  entryMeta: DevToolsDockEntry
  readonly isActive: boolean
  domElements: {
    iframe?: HTMLIFrameElement | null
    panel?: HTMLDivElement | null
  }
}
