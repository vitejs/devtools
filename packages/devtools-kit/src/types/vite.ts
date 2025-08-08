import type { RpcContext } from './rpc'

export interface DevToolsPluginOptions {
  setup: (context: DevToolsSetupContext) => void | Promise<void>
}

export interface DevToolsSetupContext {
  rpc: RpcContext
}

export interface ConnectionMeta {
  backend: 'websocket' | 'static'
  websocket?: number | string
}
