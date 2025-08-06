import type { RpcContext } from './rpc'

export interface DevToolsPluginOptions {
  setup: () => void | Promise<void>
}

export interface DevToolsSetupContext {
  rpc: RpcContext
}
