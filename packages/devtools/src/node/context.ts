import type { DevToolsNodeContext } from '@vitejs/devtools-kit'
import type { ResolvedConfig, ViteDevServer } from 'vite'
import { existsSync } from 'node:fs'
import sirv from 'sirv'
import { DevToolsDockHost } from './host-docks'
import { RpcFunctionsHost } from './host-functions'
import { builtinRpcFunctions } from './rpc'

export async function createDevToolsContext(
  viteConfig: ResolvedConfig,
  viteServer?: ViteDevServer,
): Promise<DevToolsNodeContext> {
  const cwd = viteConfig.root

  const rpcHost = new RpcFunctionsHost()
  const docksHost = new DevToolsDockHost()
  const context: DevToolsNodeContext = {
    cwd,
    viteConfig,
    viteServer,
    mode: viteConfig.command === 'serve' ? 'dev' : 'build',
    rpc: rpcHost,
    docks: docksHost,
    hostStatic,
  }
  rpcHost.context = context

  // Helper functions
  function hostStatic(baseUrl: string, distDir: string) {
    if (!existsSync(distDir)) {
      throw new Error(`[Vite DevTools] distDir ${distDir} does not exist`)
    }

    if (viteConfig.command === 'serve') {
      if (!viteServer)
        throw new Error('[Vite DevTools] viteServer is required in dev mode')
      viteServer.middlewares.use(
        baseUrl,
        sirv(distDir, {
          dev: true,
          single: true,
        }),
      )
    }
    else {
      // COPY DIST DIR TO OUT DIR
      throw new Error('[Vite DevTools] [TODO] Not implemented yet')
    }
  }

  // Build-in function to list all RPC functions
  for (const fn of builtinRpcFunctions) {
    rpcHost.register(fn)
  }

  // Register plugins
  const plugins = viteConfig.plugins.filter(plugin => 'devtools' in plugin)

  for (const plugin of plugins) {
    try {
      await plugin.devtools?.setup?.(context)
    }
    catch (error) {
      console.error(`[Vite DevTools] Error setting up plugin ${plugin.name}:`, error)
      throw error
    }
  }

  return context
}
