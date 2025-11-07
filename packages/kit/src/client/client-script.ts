import type { BirpcReturn, DevToolsDockEntry, DevToolsRpcClientFunctions, DevToolsRpcServerFunctions } from '../types'

export type DockClientScriptClientType = 'embedded' | 'standalone'

/**
 * Context for client scripts running in dock entries
 */
export interface DockClientScriptContext {
  /**
   * Interactions with the docks
   */
  docks: DockClientScriptDocks

  /**
   * The state if the current dock entry
   */
  current: DockClientScriptCurrent

  /**
   * The RPC client to interact with the server
   */
  rpc: BirpcReturn<DevToolsRpcServerFunctions, DevToolsRpcClientFunctions>

  /**
   * Type of the client environment
   *
   * 'embedded' - running inside an embedded floating panel
   * 'standalone' - running inside a standlone window (no user app)
   */
  clientType: DockClientScriptClientType
}

export interface DockClientScriptDocks {
  /**
   * Switch to the selected dock entry, pass `null` to clear the selection
   *
   * @returns Whether the selection was changed successfully
   */
  switchEntry: (id: string | null) => Promise<boolean>

  /**
   * Minimize the panel
   */
  minimize: () => Promise<void>

  /**
   * Reveal the panel
   */
  reveal: () => Promise<void>
}

export interface DockClientScriptCurrent {
  /**
   * The dock entry info of the current dock item
   */
  entryMeta: DevToolsDockEntry

  /**
   * The current state of the dock
   */
  state: 'active' | 'inactive'

  /**
   * The panel element to mount into, when the entry type is `custom-render`
   */
  elPanel?: HTMLDivElement | null

  /**
   * The iframe element to mount into, when the entry type is `iframe`
   */
  elIframe?: HTMLIFrameElement | null

  /**
   * The dock icon element
   */
  elDockIcon?: HTMLDivElement | null
}
