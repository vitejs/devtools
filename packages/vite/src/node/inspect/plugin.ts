import type { PluginWithDevTools } from '@vitejs/devtools-kit'
import type { SharedState } from '@vitejs/devtools-kit/utils/shared-state'
import type { ResolvedConfig, ResolveFn } from 'vite'
import type { ViteInspectModuleUpdatedState } from '../rpc'
import { debounce } from 'perfect-debounce'
import { diagnostics } from '../diagnostics'
import { inspectRpcFunctions, VITE_INSPECT_MODULE_UPDATED_STATE_KEY, viteRpcFunctions } from '../rpc'
import { setViteInspectContext, ViteInspectContext } from './context'
import { hijackPlugin } from './hijack'
import { setupEnvironmentInvalidation, setupMiddlewarePerformance } from './server'

export function DevToolsViteInspect(): PluginWithDevTools {
  let resolvedConfig: ResolvedConfig | undefined
  let inspectContext: ViteInspectContext | undefined
  let inspectModuleUpdatedState: SharedState<ViteInspectModuleUpdatedState> | undefined

  function notifyInspectModuleUpdated(ids: string[] | null = null) {
    inspectModuleUpdatedState?.mutate((state) => {
      state.version += 1
      state.ids = ids
      state.updatedAt = Date.now()
    })
  }

  function getInspectContext(config: ResolvedConfig): ViteInspectContext | undefined {
    if (config.command !== 'serve')
      return undefined
    inspectContext ||= new ViteInspectContext()
    return inspectContext
  }

  return {
    name: 'vite:devtools:vite-inspect',
    enforce: 'pre',

    devtools: {
      async setup(ctx) {
        ctx.diagnostics.register(diagnostics)

        for (const fn of viteRpcFunctions)
          ctx.rpc.register(fn as any)

        if (inspectContext) {
          setViteInspectContext(ctx, inspectContext)
          for (const fn of inspectRpcFunctions)
            ctx.rpc.register(fn as any)

          inspectModuleUpdatedState = await ctx.rpc.sharedState.get(VITE_INSPECT_MODULE_UPDATED_STATE_KEY, {
            initialValue: {
              version: 0,
              ids: null,
              updatedAt: 0,
            },
          })

          if (ctx.viteServer) {
            const debouncedNotify = debounce(() => {
              notifyInspectModuleUpdated()
            }, 100)

            ctx.viteServer.middlewares.use((_req: unknown, _res: unknown, next: () => void) => {
              debouncedNotify()
              next()
            })
          }
        }
      },
    },

    configResolved(config) {
      resolvedConfig = config
      const ctx = getInspectContext(config)
      if (!ctx)
        return

      const vite = ctx.getViteContext(config)
      vite.registerEnvironmentNames(Object.keys(config.environments))

      config.plugins.forEach(plugin => hijackPlugin(plugin, ctx))

      const mutableConfig = config as ResolvedConfig & {
        createResolver: ResolvedConfig['createResolver']
      }
      const createResolver = mutableConfig.createResolver
      mutableConfig.createResolver = function (this: ResolvedConfig, ...args: Parameters<ResolvedConfig['createResolver']>) {
        const resolver = createResolver.apply(this, args)
        return async (...resolverArgs: Parameters<ResolveFn>) => {
          const [id, , aliasOnly, ssr] = resolverArgs
          const start = Date.now()
          const result = await resolver(...resolverArgs)
          const end = Date.now()

          if (result && result !== id) {
            const pluginName = aliasOnly ? 'alias' : 'vite:resolve (+alias)'
            const envName = ssr ? 'ssr' : 'client'
            vite.environments.get(envName)?.recordResolveId(id, {
              name: pluginName,
              result,
              start,
              end,
            })
          }

          return result
        }
      }
    },

    configureServer(server) {
      const ctx = resolvedConfig ? getInspectContext(resolvedConfig) : inspectContext
      if (!ctx)
        return

      const vite = ctx.getViteContext(server.config)
      Object.values(server.environments).forEach(env => vite.getEnvContext(env))
      setupEnvironmentInvalidation(server, vite)

      return () => {
        setupMiddlewarePerformance(vite, server.middlewares.stack)
      }
    },

    load: {
      order: 'pre',
      handler(id) {
        inspectContext?.getEnvContext(this.environment)?.invalidate(id)
        return null
      },
    },

    hotUpdate({ modules }) {
      if (!inspectContext)
        return

      notifyInspectModuleUpdated(modules.map(module => module.id).filter(id => id != null))
    },

    sharedDuringBuild: true,
  }
}
