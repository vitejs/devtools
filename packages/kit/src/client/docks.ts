import type { DocksContext as HubDocksContext } from '@devframes/hub/client'

export interface DocksRuntimeContext {
  /**
   * Origin of the target app
   */
  appOrigin: string
}

export interface DocksContext extends HubDocksContext {
  /**
   * Vite host runtime state
   */
  readonly runtime: DocksRuntimeContext
}

export type DevToolsClientContext = DocksContext

export type {
  CommandsContext,
  DevframeClientRpcHost as DevToolsClientRpcHost,
  DockClientType,
  DockEntryState,
  DockEntryStateEvents,
  DockPanelStorage,
  DockRegistration,
  DockRenderer,
  DockRendererInstance,
  DockRendererMountOptions,
  DockRenderersContext,
  DocksEntriesContext,
  DocksPanelContext,
  RpcClientEvents,
  WhenClauseContext,
} from '@devframes/hub/client'
