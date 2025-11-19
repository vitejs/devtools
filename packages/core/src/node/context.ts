import type { DevToolsNodeContext } from '@vitejs/devtools-kit'
import type { ResolvedConfig, ViteDevServer } from 'vite'
import Debug from 'debug'
import { ContextUtils } from './context-utils'
import { DevToolsDockHost } from './host-docks'
import { RpcFunctionsHost } from './host-functions'
import { DevToolsTerminalHost } from './host-terminals'
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
    utils: ContextUtils,
    terminals: undefined!,
  }
  const rpcHost = new RpcFunctionsHost(context)
  const docksHost = new DevToolsDockHost(context)
  const viewsHost = new DevToolsViewHost(context)
  const terminalsHost = new DevToolsTerminalHost(context)
  context.rpc = rpcHost
  context.docks = docksHost
  context.views = viewsHost
  context.terminals = terminalsHost

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
