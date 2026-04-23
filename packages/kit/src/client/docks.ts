import type { RpcFunctionsCollector } from 'devframe/rpc'
import type { DevToolsClientCommand, DevToolsCommandEntry, DevToolsCommandKeybinding, DevToolsDockEntriesGrouped, DevToolsDockEntry, DevToolsDocksUserSettings, DevToolsDockUserEntry, DevToolsRpcClientFunctions, EventEmitter, WhenContext } from '../types'
import type { SharedState } from '../utils/shared-state'
import type { DevToolsRpcClient } from './rpc'

export interface DockPanelStorage {
  mode: 'float' | 'edge'
  width: number
  height: number
  top: number
  left: number
  position: 'left' | 'right' | 'bottom' | 'top'
  open: boolean
  inactiveTimeout: number
}

export type DockClientType = 'embedded' | 'standalone'

export interface DevToolsRpcContext {
  /**
   * The RPC client to interact with the server
   */
  readonly rpc: DevToolsRpcClient
}

export interface DocksContext extends DevToolsRpcContext {
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
  /**
   * The commands context for command palette and shortcuts
   */
  readonly commands: CommandsContext
  /**
   * The when-clause context for conditional visibility
   */
  readonly when: WhenClauseContext
}

export interface WhenClauseContext {
  /**
   * Get the current when-clause context snapshot.
   * Returns a reactive object with built-in variables and any custom plugin variables.
   */
  readonly context: WhenContext
}

export type DevToolsClientRpcHost = RpcFunctionsCollector<DevToolsRpcClientFunctions, DevToolsRpcContext>

export type DevToolsClientContext = DocksContext

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
  events: EventEmitter<DockEntryStateEvents>
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

export interface CommandsContext {
  /**
   * All commands (server + client)
   */
  readonly commands: DevToolsCommandEntry[]
  /**
   * Palette-visible commands only (filtered by `showInPalette !== false`)
   */
  readonly paletteCommands: DevToolsCommandEntry[]
  /**
   * Register client-side command(s). Returns cleanup function.
   */
  register: (cmd: DevToolsClientCommand | DevToolsClientCommand[]) => () => void
  /**
   * Execute a command by ID. Delegates to RPC for server commands.
   */
  execute: (id: string, ...args: any[]) => Promise<unknown>
  /**
   * Get effective keybindings for a command (defaults merged with overrides)
   */
  getKeybindings: (id: string) => DevToolsCommandKeybinding[]
  /**
   * User settings store (persisted, includes command shortcuts)
   */
  settings: SharedState<DevToolsDocksUserSettings>
  /**
   * Whether the command palette is open
   */
  paletteOpen: boolean
}
