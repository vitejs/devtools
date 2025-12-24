import type { DevToolsNodeContext } from '@vitejs/devtools-kit'
import type { ResolvedConfig, ViteDevServer } from 'vite'
import { createDebug } from 'obug'
import { debounce } from 'perfect-debounce'
import { searchForWorkspaceRoot } from 'vite'
import { ContextUtils } from './context-utils'
import { DevToolsDockHost } from './host-docks'
import { RpcFunctionsHost } from './host-functions'
import { DevToolsTerminalHost } from './host-terminals'
import { DevToolsViewHost } from './host-views'
import { builtinRpcDecalrations } from './rpc'

const debugSetup = createDebug('vite:devtools:context:setup')

export async function createDevToolsContext(
  viteConfig: ResolvedConfig,
  viteServer?: ViteDevServer,
): Promise<DevToolsNodeContext> {
  const cwd = viteConfig.root

  const context: DevToolsNodeContext = {
    cwd,
    workspaceRoot: searchForWorkspaceRoot(cwd) ?? cwd,
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
  for (const fn of builtinRpcDecalrations) {
    rpcHost.register(fn)
  }

  // Register hosts side effects
  docksHost.events.on('dock:entry:updated', debounce(() => {
    rpcHost.broadcast({
      method: 'vite:internal:docks:updated',
      args: [],
    })
  }, 10))
  terminalsHost.events.on('terminal:session:updated', debounce(() => {
    rpcHost.broadcast({
      method: 'vite:internal:terminals:updated',
      args: [],
    })
    // New terminals might affect the visibility of the terminals dock entry, we trigger it here as well
    rpcHost.broadcast({
      method: 'vite:internal:docks:updated',
      args: [],
    })
  }, 10))
  terminalsHost.events.on('terminal:session:stream-chunk', (data) => {
    rpcHost.broadcast({
      method: 'vite:internal:terminals:stream-chunk',
      args: [data],
    })
  })

  // Register plugins
  const plugins = viteConfig.plugins.filter(plugin => 'devtools' in plugin)

  for (const plugin of plugins) {
    if (!plugin.devtools?.setup)
      continue
    try {
      debugSetup(`setting up plugin ${JSON.stringify(plugin.name)}`)
      await plugin.devtools?.setup?.(context)
    }
    catch (error) {
      console.error(`[Vite DevTools] Error setting up plugin ${plugin.name}:`, error)
      throw error
    }
  }

  return context
}
