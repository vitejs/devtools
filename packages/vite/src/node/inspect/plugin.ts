import type { PluginWithDevTools } from '@vitejs/devtools-kit'
import type { ResolvedConfig, ResolveFn } from 'vite'
import type { ViteInspectModuleUpdatedSharedState } from '../rpc/inspect-module-updated'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { debounce } from 'perfect-debounce'
import { diagnostics } from '../diagnostics'
import { inspectRpcFunctions, viteRpcFunctions } from '../rpc'
import {
  getViteInspectModuleUpdatedState,
  notifyViteInspectModuleUpdated,
} from '../rpc/inspect-module-updated'
import { setViteInspectContext, ViteInspectContext } from './context'
import { hijackPlugin } from './hijack'
import {
  isTransformRequestStale,
  setupEnvironmentInvalidation,
  setupMiddlewarePerformance,
  trackTransformRequestId,
} from './server'

export function DevToolsViteInspect(): PluginWithDevTools {
  let inspectContext: ViteInspectContext | undefined
  let inspectContextPromise: Promise<ViteInspectContext> | undefined
  let closingInspectContext: Promise<void> | undefined
  let inspectStorageDir: string | undefined
  let inspectModuleUpdatedState: ViteInspectModuleUpdatedSharedState | undefined

  function notifyInspectModuleUpdated(ids: string[] | null = null) {
    if (inspectModuleUpdatedState)
      notifyViteInspectModuleUpdated(inspectModuleUpdatedState, ids)
  }

  async function createInspectContext(config: ResolvedConfig): Promise<ViteInspectContext> {
    const cacheDir = config.cacheDir || join(config.root, 'node_modules/.vite')
    const storageDir = join(cacheDir, 'devtools', 'inspect')
    inspectStorageDir = storageDir
    removeInspectStorage()

    try {
      const ctx = await ViteInspectContext.create({
        filename: join(storageDir, 'payloads.bin'),
      })
      inspectContext = ctx
      return ctx
    }
    catch (error) {
      removeInspectStorage()
      throw error
    }
  }

  function ensureInspectContext(config: ResolvedConfig): Promise<ViteInspectContext | undefined> {
    if (config.command !== 'serve')
      return Promise.resolve(undefined)

    inspectContextPromise ??= createInspectContext(config)
    return inspectContextPromise
  }

  async function closeInspectContext(): Promise<void> {
    const ctx = inspectContext ?? await inspectContextPromise
    if (!ctx)
      return

    closingInspectContext ??= (async () => {
      await ctx.close()
    })()
    await closingInspectContext
  }

  function removeInspectStorage(): void {
    if (inspectStorageDir)
      rmSync(inspectStorageDir, { recursive: true, force: true })
  }

  async function resolveInspectContext(): Promise<ViteInspectContext | undefined> {
    if (inspectContext)
      return inspectContext
    return inspectContextPromise
  }

  return {
    name: 'vite:devtools:vite-inspect',
    enforce: 'pre',

    devtools: {
      async setup(ctx) {
        ctx.diagnostics.register(diagnostics)

        for (const fn of viteRpcFunctions)
          ctx.rpc.register(fn as any)

        const currentInspectContext = await resolveInspectContext()

        if (currentInspectContext) {
          setViteInspectContext(ctx, currentInspectContext)
          for (const fn of inspectRpcFunctions)
            ctx.rpc.register(fn as any)

          inspectModuleUpdatedState = await getViteInspectModuleUpdatedState(ctx)

          if (ctx.viteServer) {
            const debouncedNotify = debounce(() => {
              notifyInspectModuleUpdated()
            }, 100)

            ctx.viteServer.watcher.on('all', debouncedNotify)
            ctx.viteServer.middlewares.use((_req: unknown, _res: unknown, next: () => void) => {
              debouncedNotify()
              next()
            })
          }
        }
      },
    },

    async configResolved(config) {
      const ctx = await ensureInspectContext(config)
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
          const transformRequest = trackTransformRequestId(id)
          const start = Date.now()
          const result = await resolver(...resolverArgs)
          const end = Date.now()

          if (result && result !== id && !isTransformRequestStale(transformRequest)) {
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
      const ctx = inspectContext
      if (!ctx)
        return

      const closeServer = server.close.bind(server)
      server.close = async () => {
        try {
          await closeServer()
        }
        finally {
          await closeInspectContext()
        }
      }

      const vite = ctx.getViteContext(server.config)
      Object.values(server.environments).forEach(env => vite.getEnvContext(env))
      setupEnvironmentInvalidation(server, vite)

      return () => {
        setupMiddlewarePerformance(vite, server.middlewares.stack)
      }
    },

    hotUpdate({ modules }) {
      if (!inspectContext)
        return

      notifyInspectModuleUpdated(modules.map(module => module.id).filter(id => id != null))
    },

    sharedDuringBuild: true,
  }
}
