import type { ResolvedConfig, ViteDevServer } from 'vite'
import type { DockClientScriptContext } from '../client'
import type { RpcFunctionsHost } from './rpc'
import type { ClientScriptEntry, DevToolsDockHost, DevToolsViewHost } from './views'

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
  readonly cwd: string
  readonly mode: 'dev' | 'build'
  readonly viteConfig: ResolvedConfig
  readonly viteServer?: ViteDevServer
  rpc: RpcFunctionsHost
  docks: DevToolsDockHost
  views: DevToolsViewHost
  utils: DevToolsNodeUtils
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
