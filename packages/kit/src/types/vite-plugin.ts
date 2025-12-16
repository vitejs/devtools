import type { ResolvedConfig, ViteDevServer } from 'vite'
import type { DockClientScriptContext } from '../client'
import type { ClientScriptEntry, DevToolsDockHost } from './docks'
import type { RpcFunctionsHost } from './rpc'
import type { DevToolsTerminalHost } from './terminals'
import type { DevToolsViewHost } from './views'

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
