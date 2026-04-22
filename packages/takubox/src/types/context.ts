import type { DevToolsCommandsHost } from './commands'
import type { ClientScriptEntry, DevToolsDockHost, JsonRenderer, JsonRenderSpec } from './docks'
import type { DevToolsHost } from './host'
import type { DevToolsLogsHost } from './logs'
import type { DevToolsTerminalHost } from './terminals'
import type { DevToolsViewHost } from './views'

export interface DevToolsCapabilities {
  rpc?: boolean
  views?: boolean
}

export interface DevToolsNodeContext {
  readonly workspaceRoot: string
  readonly cwd: string
  readonly mode: 'dev' | 'build'
  /**
   * Host runtime abstraction — exposes `mountStatic` / `resolveOrigin`.
   */
  host: DevToolsHost
  rpc: import('./rpc').RpcFunctionsHost
  docks: DevToolsDockHost
  views: DevToolsViewHost
  utils: DevToolsNodeUtils
  terminals: DevToolsTerminalHost
  logs: DevToolsLogsHost
  commands: DevToolsCommandsHost
  /**
   * Create a JsonRenderer handle for building json-render powered UIs.
   */
  createJsonRenderer: (spec: JsonRenderSpec) => JsonRenderer
}

export interface DevToolsNodeUtils {
  /**
   * Create a simple client script from a function or stringified code.
   *
   * @deprecated testing helper; prefer a proper importable module.
   * @experimental
   */
  createSimpleClientScript: (fn: string | ((ctx: any) => void)) => ClientScriptEntry
}

export interface ConnectionMeta {
  backend: 'websocket' | 'static'
  websocket?: number | string
}

export interface RemoteConnectionInfo extends ConnectionMeta {
  backend: 'websocket'
  websocket: string
  v: 1
  authToken: string
  origin: string
}
