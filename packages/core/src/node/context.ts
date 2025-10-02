import type { ResolvedConfig, ViteDevServer } from 'vite'
import type { DevToolsNodeContext } from '../../../kit/src'
import Debug from 'debug'
import { DevToolsDockHost } from './host-docks'
import { RpcFunctionsHost } from './host-functions'
import { DevToolsViewHost } from './host-views'
import { builtinRpcFunctions } from './rpc'

const debug = Debug('vite:devtools:context')

export async function createDevToolsContext(
  viteConfig: ResolvedConfig,
  viteServer?: ViteDevServer,
): Promise<DevToolsNodeContext> {
  const cwd = viteConfig.root

  const context: DevToolsNodeContext = {
    cwd,
    viteConfig,
    viteServer,
    mode: viteConfig.command === 'serve' ? 'dev' : 'build',
    rpc: undefined!,
    docks: undefined!,
    views: undefined!,
  }
  const rpcHost = new RpcFunctionsHost(context)
  const docksHost = new DevToolsDockHost(context)
  const viewsHost = new DevToolsViewHost(context)
  context.rpc = rpcHost
  context.docks = docksHost
  context.views = viewsHost

  // Build-in function to list all RPC functions
  for (const fn of builtinRpcFunctions) {
    rpcHost.register(fn)
  }

  // Register plugins
  const plugins = viteConfig.plugins.filter(plugin => 'devtools' in plugin)

  for (const plugin of plugins) {
    if (!plugin.devtools?.setup)
      continue
    try {
      debug(`Setting up plugin ${plugin.name}`)
      await plugin.devtools?.setup?.(context)
    }
    catch (error) {
      console.error(`[Vite DevTools] Error setting up plugin ${plugin.name}:`, error)
      throw error
    }
  }

  return context
}
