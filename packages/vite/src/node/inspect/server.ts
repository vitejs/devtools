import type { Connect, ViteDevServer } from 'vite'
import type {
  ViteInspectEnvironmentContext,
  ViteInspectViteContext,
} from './context'
import { AsyncLocalStorage } from 'node:async_hooks'

const timestampRE = /\bt=\d{13}&?\b/
const trailingSeparatorRE = /[?&]$/

export interface ViteInspectTransformRequestState {
  active: boolean
  ids: Set<string>
  stale: boolean
}

interface EnvironmentInvalidationState {
  activeRequests: Set<ViteInspectTransformRequestState>
  contexts: Set<ViteInspectEnvironmentContext>
}

interface MiddlewareLayer {
  handle?: unknown
}

const transformRequestStorage = new AsyncLocalStorage<ViteInspectTransformRequestState>()
const environmentInvalidationStates = new WeakMap<object, EnvironmentInvalidationState>()

export function trackTransformRequestId(id: string): ViteInspectTransformRequestState | undefined {
  const request = transformRequestStorage.getStore()
  if (request?.active)
    request.ids.add(normalizeRequestId(id))
  return request?.active ? request : undefined
}

export function isTransformRequestStale(request?: ViteInspectTransformRequestState): boolean {
  return request?.stale === true
}

export function setupEnvironmentInvalidation(server: ViteDevServer, vite: ViteInspectViteContext): void {
  Object.values(server.environments).forEach((env) => {
    const envContext = vite.getEnvContext(env)
    const existingState = environmentInvalidationStates.get(env)
    if (existingState) {
      existingState.contexts.add(envContext)
      return
    }

    const state: EnvironmentInvalidationState = {
      activeRequests: new Set(),
      contexts: new Set([envContext]),
    }
    environmentInvalidationStates.set(env, state)

    const transformRequest = env.transformRequest
    env.transformRequest = function (...args) {
      const request: ViteInspectTransformRequestState = {
        active: true,
        ids: new Set([normalizeRequestId(args[0])]),
        stale: false,
      }
      state.activeRequests.add(request)
      return transformRequestStorage.run(request, () => transformRequest.apply(this, args))
        .finally(() => {
          request.active = false
          request.ids.clear()
          state.activeRequests.delete(request)
        })
    }

    const invalidateModule = env.moduleGraph.invalidateModule

    env.moduleGraph.invalidateModule = function (...args) {
      const mod = args[0]
      const seen = args[1]
      const softInvalidate = args[4] === true
      const invalidationState = (mod as { invalidationState?: unknown } | undefined)?.invalidationState
      const alreadyHardInvalidated = invalidationState === 'HARD_INVALIDATED'
      const shouldInvalidateInspect = !softInvalidate
        && (!seen?.has(mod) || !alreadyHardInvalidated)
      if (mod) {
        markStaleRequests(state.activeRequests, mod.id, mod.url)
        if (mod.id && shouldInvalidateInspect) {
          for (const context of state.contexts)
            context.invalidate(mod.id)
        }
      }
      return invalidateModule.apply(this, args)
    }
  })
}

function markStaleRequests(
  requests: Set<ViteInspectTransformRequestState>,
  ...ids: Array<string | null | undefined>
): void {
  const normalizedIds = ids.filter(id => id != null).map(normalizeRequestId)
  for (const request of requests) {
    if (normalizedIds.some(id => request.ids.has(id)))
      request.stale = true
  }
}

function normalizeRequestId(id: string): string {
  return id.replace(timestampRE, '').replace(trailingSeparatorRE, '')
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
