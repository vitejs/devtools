import type { DevToolsSetupContext, ViteDevtoolsRpcFunctions } from '@vitejs/devtools-kit'
import type { ResolvedConfig } from 'vite'
import { RpcFunctionsHost } from './functions'
import { DevtoolsViewHost } from './views'

export async function createDevToolsContext(viteConfig: ResolvedConfig): Promise<DevToolsSetupContext> {
  const cwd = viteConfig.root

  const rpcHost = new RpcFunctionsHost({
    cwd,
    mode: viteConfig.command === 'serve' ? 'dev' : 'build',
    meta: {},
  })
  const viewsHost = new DevtoolsViewHost()
  const context: DevToolsSetupContext = {
    cwd,
    viteConfig,
    mode: viteConfig.command === 'serve' ? 'dev' : 'build',
    rpc: rpcHost,
    views: viewsHost,
  }

  // Build-in function to list all RPC functions
  rpcHost.register({
    name: 'vite:list-rpc-functions',
    type: 'query',
    setup: () => {
      return {
        handler: () => Object.fromEntries(
          Array.from(rpcHost.definitions.entries())
            .map(([name, fn]) => [name, {
              type: fn.type,
            }]),
        ) as ViteDevtoolsRpcFunctions,
      }
    },
  })
  rpcHost.register({
    name: 'vite:list-views',
    type: 'query',
    setup: () => {
      return {
        handler: () => Array.from(viewsHost.views.values()),
      }
    },
  })

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
