import type { RpcFunctionsCollector } from 'birpc-x'
import type { Raw } from 'vue'
import type { DevToolsDockEntriesGrouped } from '../../../core/src/client/webcomponents/state/dock-settings'
import type { DevToolsDockEntry, DevToolsDocksUserSettings, DevToolsDockUserEntry, DevToolsRpcClientFunctions, EventEmitter } from '../types'
import type { SharedState } from '../utils/shared-state'
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

export interface DevToolsClientContext {
  /**
   * The RPC client to interact with the server
   */
  readonly rpc: DevToolsRpcClient
}

export interface DocksContext extends DevToolsClientContext {
  /**
   * Type of the client environment
   *
   * 'embedded' - running inside an embedded floating panel
   * 'standalone' - running inside a standalone window (no user app)
   */
  readonly clientType: 'embedded' | 'standalone'
  /**
   * The panel context
   */
  readonly panel: DocksPanelContext
  /**
   * The docks entries context
   */
  readonly docks: DocksEntriesContext
}

export type DevToolsClientRpcHost = RpcFunctionsCollector<DevToolsRpcClientFunctions, DevToolsClientContext>

export interface DocksPanelContext {
  store: DockPanelStorage
  isDragging: boolean
  isResizing: boolean
  readonly isVertical: boolean
}

export interface DocksEntriesContext {
  selectedId: string | null
  readonly selected: DevToolsDockEntry | null
  entries: DevToolsDockEntry[]
  entryToStateMap: Map<string, DockEntryState>
  groupedEntries: DevToolsDockEntriesGrouped
  settings: SharedState<DevToolsDocksUserSettings>
  /**
   * Get the state of a dock entry by its ID
   */
  getStateById: (id: string) => DockEntryState | undefined
  /**
   * Switch to the selected dock entry, pass `null` to clear the selection
   *
   * @returns Whether the selection was changed successfully
   */
  switchEntry: (id?: string | null) => Promise<boolean>
  /**
   * Toggle the selected dock entry
   *
   * @returns Whether the selection was changed successfully
   */
  toggleEntry: (id: string) => Promise<boolean>
}

export interface DockEntryState {
  entryMeta: DevToolsDockEntry
  readonly isActive: boolean
  domElements: {
    iframe?: HTMLIFrameElement | null
    panel?: HTMLDivElement | null
  }
  events: Raw<EventEmitter<DockEntryStateEvents>>
}

export interface DockEntryStateEvents {
  'entry:activated': () => void
  'entry:deactivated': () => void
  'entry:updated': (newMeta: DevToolsDockUserEntry) => void
  'dom:panel:mounted': (panel: HTMLDivElement) => void
  'dom:iframe:mounted': (iframe: HTMLIFrameElement) => void
}

export interface RpcClientEvents {
  'rpc:is-trusted:updated': (isTrusted: boolean) => void
}
