import type { Connect, ViteDevServer } from 'vite'
import type { ViteInspectViteContext } from './context'

const timestampRE = /\bt=\d{13}&?\b/
const trailingSeparatorRE = /[?&]$/

interface MiddlewareLayer {
  handle?: unknown
}

export function setupEnvironmentInvalidation(server: ViteDevServer, vite: ViteInspectViteContext): void {
  Object.values(server.environments).forEach((env) => {
    const envContext = vite.getEnvContext(env)
    const invalidateModule = env.moduleGraph.invalidateModule

    env.moduleGraph.invalidateModule = function (...args) {
      const mod = args[0]
      if (mod?.id)
        envContext.invalidate(mod.id)
      return invalidateModule.apply(this, args)
    }
  })
}

export function setupMiddlewarePerformance(vite: ViteInspectViteContext, middlewares: MiddlewareLayer[]): void {
  let firstMiddlewareIndex = -1

  middlewares.forEach((middleware, index) => {
    const originalHandle = middleware.handle
    if (typeof originalHandle !== 'function' || !originalHandle.name)
      return

    middleware.handle = function (this: unknown, ...middlewareArgs: Parameters<Connect.HandleFunction>) {
      let req: Parameters<Connect.HandleFunction>[0]
      if (middlewareArgs.length === 4)
        req = middlewareArgs[1] as any
      else
        req = middlewareArgs[0]

      const start = Date.now()
      const url = req.url?.replace(timestampRE, '').replace(trailingSeparatorRE, '') || '/'
      const metrics = vite.data.serverMetrics.middleware[url] ||= []
      if (firstMiddlewareIndex < 0)
        firstMiddlewareIndex = index
      if (index === firstMiddlewareIndex)
        metrics.length = 0

      const result = originalHandle.apply(this as any, middlewareArgs as any)
      Promise.resolve(result).then(() => {
        const total = Date.now() - start
        metrics.push({
          self: metrics.length ? Math.max(total - (metrics.at(-1)?.total || 0), 0) : total,
          total,
          name: originalHandle.name,
        })
      })

      return result
    } as Connect.HandleFunction

    Object.defineProperty(middleware.handle, 'name', {
      value: originalHandle.name,
      configurable: true,
      enumerable: true,
    })
  })
}
