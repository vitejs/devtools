import type { RpcFunctionsHost } from './rpc'
import type { DevtoolsViewHost } from './views'

export interface DevToolsPluginOptions {
  setup: (context: DevToolsSetupContext) => void | Promise<void>
}

export interface DevToolsSetupContext {
  readonly cwd: string
  readonly mode: 'dev' | 'build'
  rpc: RpcFunctionsHost
  views: DevtoolsViewHost
}

export interface ConnectionMeta {
  backend: 'websocket' | 'static'
  websocket?: number | string
}
