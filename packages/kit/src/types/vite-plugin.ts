import type { ResolvedConfig, ViteDevServer } from 'vite'
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
  clientEntryFromSimpleFunction: (fn: () => void) => ClientScriptEntry
}

export interface ConnectionMeta {
  backend: 'websocket' | 'static'
  websocket?: number | string
}
