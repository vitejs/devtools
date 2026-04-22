import type { ClientScriptEntry, DevToolsCommandsHost, DevToolsDockHost, DevToolsLogsHost, DevToolsTerminalHost, DevToolsViewHost, JsonRenderer, JsonRenderSpec } from 'takubox/types'
import type { ResolvedConfig, ViteDevServer } from 'vite'
import type { DockClientScriptContext } from '../client'
import type { RpcFunctionsHost } from './rpc'

export interface DevToolsCapabilities {
  rpc?: boolean
  views?: boolean
}

export interface DevToolsPluginOptions {
  capabilities?: {
    dev?: DevToolsCapabilities | boolean
    build?: DevToolsCapabilities | boolean
  }
  setup: (context: DevToolsNodeContext) => void | Promise<void>
}

export interface DevToolsNodeContext {
  /**
   * Workspace root directory of Vite DevTools
   */
  readonly workspaceRoot: string
  /**
   * Current working directory of Vite DevTools
   */
  readonly cwd: string
  /**
   * Current mode of Vite DevTools
   * - 'dev' - when Vite DevTools is running in dev mode
   * - 'build' - when Vite DevTools is running in build mode (no server)
   */
  readonly mode: 'dev' | 'build'
  /**
   * Resolved Vite configuration
   */
  readonly viteConfig: ResolvedConfig
  /**
   * Vite dev server instance (only available in dev mode)
   */
  readonly viteServer?: ViteDevServer
  /**
   * RPC functions host, for registering server-side RPC functions and calling client-side RPC functions
   */
  rpc: RpcFunctionsHost
  /**
   * Docks host, for registering dock entries
   */
  docks: DevToolsDockHost
  /**
   * Views host, for registering static views
   */
  views: DevToolsViewHost
  /**
   * Utils for the node context
   */
  utils: DevToolsNodeUtils
  /**
   * Terminals host, for registering terminal sessions and streaming terminal output
   */
  terminals: DevToolsTerminalHost
  /**
   * Logs host, for emitting and managing structured log entries
   */
  logs: DevToolsLogsHost
  /**
   * Commands host, for registering and executing commands
   */
  commands: DevToolsCommandsHost
  /**
   * Create a JsonRenderer handle for building json-render powered UIs.
   * Pass the returned handle as `ui` when registering a `json-render` dock entry.
   */
  createJsonRenderer: (spec: JsonRenderSpec) => JsonRenderer
}

export interface DevToolsNodeUtils {
  /**
   * Create a simple client script from a function or stringified code
   *
   * @deprecated DO NOT USE. This is mostly for testing only. Please use a proper importable module instead.
   * @experimental
   */
  createSimpleClientScript: (fn: string | ((ctx: DockClientScriptContext) => void)) => ClientScriptEntry
}

export interface ConnectionMeta {
  backend: 'websocket' | 'static'
  websocket?: number | string
}

/**
 * Connection descriptor injected into the URL of a remote-UI iframe dock.
 *
 * Superset of {@link ConnectionMeta} — a parsed descriptor can be passed
 * straight to `getDevToolsRpcClient({ connectionMeta })` without translation.
 */
export interface RemoteConnectionInfo extends ConnectionMeta {
  /** Narrowed — remote connections always use the websocket backend. */
  backend: 'websocket'
  /** Narrowed — remote connections always carry a full `ws://` or `wss://` URL with host + port. */
  websocket: string
  /** Schema version for forward compatibility. */
  v: 1
  /** Pre-approved, session-only auth token bound to this dock registration. */
  authToken: string
  /** User's dev-server origin (e.g. `http://localhost:5173`) — for display/debug. */
  origin: string
}
