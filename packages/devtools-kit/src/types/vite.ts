import type { RpcFunctionsHost } from './rpc'
import type { ViteDevtoolsViewHost } from './views'

export interface DevToolsPluginOptions {
  setup: (context: DevToolsSetupContext) => void | Promise<void>
}

export interface DevToolsSetupContext {
  readonly cwd: string
  readonly mode: 'dev' | 'build'
  rpc: RpcFunctionsHost
  views: ViteDevtoolsViewHost
}

export interface ConnectionMeta {
  backend: 'websocket' | 'static'
  websocket?: number | string
}
