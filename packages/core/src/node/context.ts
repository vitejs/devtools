import type { DevToolsNodeContext, JsonRenderer, JsonRenderSpec } from '@vitejs/devtools-kit'
import type { ResolvedConfig, ViteDevServer } from 'vite'
import { createDebug } from 'obug'
import { debounce } from 'perfect-debounce'
import { searchForWorkspaceRoot, version as viteVersion } from 'vite'
import { ContextUtils } from './context-utils'
import { DevToolsDockHost } from './host-docks'
import { RpcFunctionsHost } from './host-functions'
import { DevToolsLogsHost } from './host-logs'
import { DevToolsTerminalHost } from './host-terminals'
import { DevToolsViewHost } from './host-views'
import { builtinRpcDeclarations } from './rpc'
import { isObject } from './utils'

const debugSetup = createDebug('vite:devtools:context:setup')

function shouldSkipSetupByCapabilities(
  plugin: ResolvedConfig['plugins'][number],
  mode: 'dev' | 'build',
): boolean {
  const modeCapabilities = plugin.devtools?.capabilities?.[mode]
  if (modeCapabilities === false)
    return true
  if (!isObject(modeCapabilities))
    return false
  return Object.values(modeCapabilities).includes(false)
}

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
    viteVersion,
    mode: viteConfig.command === 'serve' ? 'dev' : 'build',
    rpc: undefined!,
    docks: undefined!,
    views: undefined!,
    utils: ContextUtils,
    terminals: undefined!,
    logs: undefined!,
    createJsonRenderer: undefined!,
  }
  const rpcHost = new RpcFunctionsHost(context)
  const docksHost = new DevToolsDockHost(context)
  const viewsHost = new DevToolsViewHost(context)
  const terminalsHost = new DevToolsTerminalHost(context)
  const logsHost = new DevToolsLogsHost(context)
  context.rpc = rpcHost
  context.docks = docksHost
  context.views = viewsHost
  context.terminals = terminalsHost
  context.logs = logsHost

  // json-render factory
  let jrCounter = 0
  context.createJsonRenderer = (initialSpec: JsonRenderSpec): JsonRenderer => {
    const stateKey = `__jr:${jrCounter++}`
    const statePromise = rpcHost.sharedState.get(stateKey as any, {
      initialValue: initialSpec as any,
    })

    return {
      _stateKey: stateKey,
      async updateSpec(spec) {
        const state = await statePromise
        state.mutate(() => spec as any)
      },
      async updateState(newState) {
        const state = await statePromise
        state.mutate((draft: any) => {
          draft.state = { ...draft.state, ...newState }
        })
      },
    }
  }

  // Build-in function to list all RPC functions
  for (const fn of builtinRpcDeclarations) {
    rpcHost.register(fn)
  }

  await docksHost.init()

  const docksSharedState = await rpcHost.sharedState.get('devtoolskit:internal:docks', { initialValue: [] })

  // Register hosts side effects
  docksHost.events.on('dock:entry:updated', debounce(() => {
    docksSharedState.mutate(() => context.docks.values())
  }, context.mode === 'build' ? 0 : 10))

  terminalsHost.events.on('terminal:session:updated', debounce(() => {
    rpcHost.broadcast({
      method: 'devtoolskit:internal:terminals:updated',
      args: [],
    })
    docksSharedState.mutate(() => context.docks.values())
  }, context.mode === 'build' ? 0 : 10))

  terminalsHost.events.on('terminal:session:stream-chunk', (data) => {
    rpcHost.broadcast({
      method: 'devtoolskit:internal:terminals:stream-chunk',
      args: [data],
    })
  })

  const debouncedLogsUpdate = debounce(() => {
    rpcHost.broadcast({
      method: 'devtoolskit:internal:logs:updated',
      args: [],
    })
    docksSharedState.mutate(() => context.docks.values())
  }, context.mode === 'build' ? 0 : 10)

  logsHost.events.on('log:added', () => debouncedLogsUpdate())
  logsHost.events.on('log:updated', () => debouncedLogsUpdate())
  logsHost.events.on('log:removed', () => debouncedLogsUpdate())
  logsHost.events.on('log:cleared', () => debouncedLogsUpdate())

  // Register plugins
  const plugins = viteConfig.plugins.filter(plugin => 'devtools' in plugin)
  for (const plugin of plugins) {
    if (!plugin.devtools?.setup)
      continue
    if (shouldSkipSetupByCapabilities(plugin, context.mode)) {
      debugSetup(`skipping plugin ${JSON.stringify(plugin.name)} due to disabled capabilities in ${context.mode} mode`)
      continue
    }
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
