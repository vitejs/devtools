import type { ResolvedConfig } from 'vite'
import type { RpcFunctionsHost } from './rpc'
import type { DevToolsDockHost } from './views'

export interface DevToolsCapabilities {
  rpc?: boolean
  views?: boolean
}

export interface DevToolsPluginOptions {
  capabilities?: {
    dev?: DevToolsCapabilities | boolean
    build?: DevToolsCapabilities | boolean
  }
  setup: (context: DevToolsSetupContext) => void | Promise<void>
}

export interface DevToolsSetupContext {
  readonly cwd: string
  readonly mode: 'dev' | 'build'
  readonly viteConfig: ResolvedConfig
  rpc: RpcFunctionsHost
  docks: DevToolsDockHost
}

export interface ConnectionMeta {
  backend: 'websocket' | 'static'
  websocket?: number | string
}
