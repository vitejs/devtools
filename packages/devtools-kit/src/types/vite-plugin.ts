import type { ResolvedConfig, ViteDevServer } from 'vite'
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
  setup: (context: DevToolsNodeContext) => void | Promise<void>
}

export interface DevToolsNodeContext {
  readonly cwd: string
  readonly mode: 'dev' | 'build'
  readonly viteConfig: ResolvedConfig
  readonly viteServer?: ViteDevServer
  rpc: RpcFunctionsHost
  docks: DevToolsDockHost

  /**
   * Helper to host static files
   * - In `dev` mode, it will register middleware to `viteServer.middlewares` to host the static files
   * - In `build` mode, it will copy the static files to the dist directory
   */
  hostStatic: (baseUrl: string, distDir: string) => void
  staticDirs: { baseUrl: string, distDir: string }[]
}

export interface ConnectionMeta {
  backend: 'websocket' | 'static'
  websocket?: number | string
}
