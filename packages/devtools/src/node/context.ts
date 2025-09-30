import type { DevToolsNodeContext } from '@vitejs/devtools-kit'
import type { ResolvedConfig, ViteDevServer } from 'vite'
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
  }
  rpcHost.context = context

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
