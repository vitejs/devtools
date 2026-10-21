import type { Plugin } from 'vite'
import type { ViteInspectContext } from './context'
import {
  isTransformRequestStale,
  trackTransformRequestId,
} from './server'
import { parseError, stringifyError } from './utils'

type PluginWithOrder = Plugin & {
  order?: string
}

type HookWrapper = (
  fn: (...args: any[]) => any,
  context: any,
  args: any[],
  order?: string,
) => any

function hijackHook(plugin: PluginWithOrder, name: 'transform' | 'load' | 'resolveId', wrapper: HookWrapper): void {
  const hook = plugin[name] as any
  if (!hook)
    return

  let order = `${plugin.order || plugin.enforce || 'normal'}`

  if (typeof hook === 'object' && 'handler' in hook) {
    const oldFn = hook.handler
    order += `-${hook.order || hook.enforce || 'normal'}`
    hook.handler = function (...args: any[]) {
      return wrapper(oldFn, this, args, order)
    }
  }
  else if (typeof hook === 'object' && 'transform' in hook) {
    const oldFn = hook.transform
    order += `-${hook.order || hook.enforce || 'normal'}`
    hook.transform = function (...args: any[]) {
      return wrapper(oldFn, this, args, order)
    }
  }
  else {
    const oldFn = hook
    const mutablePlugin = plugin as unknown as Record<string, unknown>
    mutablePlugin[name] = function (...args: any[]) {
      return wrapper(oldFn, this, args, order)
    }
  }
}

type HookSettled = (resultValue: any, error: unknown, start: number, end: number) => void

// Epoch milliseconds with sub-millisecond precision, comparable with `Date.now()`.
function now(): number {
  return performance.timeOrigin + performance.now()
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return value != null && typeof (value as PromiseLike<unknown>).then === 'function'
}

// Keep sync hooks sync: only async results pay for a promise chain.
function measureHook(fn: (...args: any[]) => any, context: any, args: any[], settled: HookSettled): any {
  const start = now()
  let resultValue: any
  try {
    resultValue = fn.apply(context, args)
  }
  catch (error) {
    settled(undefined, error, start, now())
    throw error
  }

  if (!isThenable(resultValue)) {
    settled(resultValue, undefined, start, now())
    return resultValue
  }

  return Promise.resolve(resultValue).then(
    (value) => {
      settled(value, undefined, start, now())
      return value
    },
    (error) => {
      settled(undefined, error, start, now())
      throw error
    },
  )
}

const hijackedPlugins = new WeakSet<Plugin>()

export function hijackPlugin(plugin: Plugin, ctx: ViteInspectContext): void {
  if (hijackedPlugins.has(plugin))
    return
  hijackedPlugins.add(plugin)

  hijackHook(plugin, 'transform', (fn, context, args, order) => {
    const code = args[0] as string
    const id = args[1] as string
    const transformRequest = trackTransformRequestId(id)
    const envContext = ctx.filter(id) ? ctx.getEnvContext(context?.environment) : undefined
    if (!envContext)
      return fn.apply(context, args)

    return measureHook(fn, context, args, (resultValue, error, start, end) => {
      if (isTransformRequestStale(transformRequest))
        return

      const result = error
        ? '[Error]'
        : typeof resultValue === 'string'
          ? resultValue
          : resultValue?.code?.toString()

      envContext.recordTransform(id, {
        name: plugin.name,
        result,
        start,
        end,
        order,
        error: error ? parseError(error) : undefined,
      }, code, plugin)
    })
  })

  hijackHook(plugin, 'load', (fn, context, args) => {
    const id = args[0] as string
    const transformRequest = trackTransformRequestId(id)
    const envContext = ctx.getEnvContext(context?.environment)
    if (!envContext)
      return fn.apply(context, args)

    return measureHook(fn, context, args, (resultValue, error, start, end) => {
      if (isTransformRequestStale(transformRequest))
        return

      const result = error
        ? '[Error]'
        : typeof resultValue === 'string'
          ? resultValue
          : resultValue?.code

      if (result != null) {
        envContext.recordLoad(id, {
          name: plugin.name,
          result,
          start,
          end,
          error: error ? parseError(error) : undefined,
        }, plugin)
      }
      else {
        envContext.recordLoadCall(id, {
          name: plugin.name,
          start,
          end,
          error: error ? parseError(error) : undefined,
        }, plugin)
      }
    })
  })

  hijackHook(plugin, 'resolveId', (fn, context, args) => {
    const id = args[0] as string
    const transformRequest = trackTransformRequestId(id)
    const envContext = ctx.filter(id) ? ctx.getEnvContext(context?.environment) : undefined
    if (!envContext)
      return fn.apply(context, args)

    return measureHook(fn, context, args, (resultValue, error, start, end) => {
      if (isTransformRequestStale(transformRequest))
        return

      const result = error
        ? stringifyError(error)
        : typeof resultValue === 'object'
          ? resultValue?.id
          : resultValue

      if (result) {
        envContext.recordResolveId(id, {
          name: plugin.name,
          result,
          start,
          end,
          error,
        }, plugin)
      }
      else {
        envContext.recordResolveIdCall(id, {
          name: plugin.name,
          result,
          start,
          end,
          error,
        }, plugin)
      }
    })
  })
}
