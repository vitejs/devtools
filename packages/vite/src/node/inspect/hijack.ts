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

const hijackedPlugins = new WeakSet<Plugin>()

export function hijackPlugin(plugin: Plugin, ctx: ViteInspectContext): void {
  if (hijackedPlugins.has(plugin))
    return
  hijackedPlugins.add(plugin)

  hijackHook(plugin, 'transform', async (fn, context, args, order) => {
    const code = args[0] as string
    const id = args[1] as string
    const transformRequest = trackTransformRequestId(id)
    const envContext = ctx.filter(id) ? ctx.getEnvContext(context?.environment) : undefined
    let resultValue: any
    let error: unknown
    const start = Date.now()

    try {
      resultValue = await fn.apply(context, args)
    }
    catch (err) {
      error = err
    }

    const end = Date.now()
    const result = error
      ? '[Error]'
      : typeof resultValue === 'string'
        ? resultValue
        : resultValue?.code?.toString()

    if (envContext && !isTransformRequestStale(transformRequest)) {
      const sourcemaps = typeof resultValue === 'string' ? null : resultValue?.map
      envContext.recordTransform(id, {
        name: plugin.name,
        result,
        start,
        end,
        order,
        sourcemaps,
        error: error ? parseError(error) : undefined,
      }, code, plugin)
    }

    if (error)
      throw error
    return resultValue
  })

  hijackHook(plugin, 'load', async (fn, context, args) => {
    const id = args[0] as string
    const transformRequest = trackTransformRequestId(id)
    const envContext = ctx.getEnvContext(context?.environment)
    let resultValue: any
    let error: unknown
    const start = Date.now()

    try {
      resultValue = await fn.apply(context, args)
    }
    catch (err) {
      error = err
    }

    const end = Date.now()
    const result = error
      ? '[Error]'
      : typeof resultValue === 'string'
        ? resultValue
        : resultValue?.code
    const sourcemaps = typeof resultValue === 'string' ? null : resultValue?.map

    const info = {
      name: plugin.name,
      result,
      start,
      end,
      sourcemaps,
      error: error ? parseError(error) : undefined,
    }

    if (result != null && envContext && !isTransformRequestStale(transformRequest)) {
      envContext.recordLoad(id, {
        ...info,
        result,
      }, plugin)
    }
    else if (envContext && !isTransformRequestStale(transformRequest)) {
      envContext.recordLoadCall(id, {
        name: plugin.name,
        start,
        end,
        error: error ? parseError(error) : undefined,
      }, plugin)
    }

    if (error)
      throw error
    return resultValue
  })

  hijackHook(plugin, 'resolveId', async (fn, context, args) => {
    const id = args[0] as string
    const transformRequest = trackTransformRequestId(id)
    const envContext = ctx.filter(id) ? ctx.getEnvContext(context?.environment) : undefined
    let resultValue: any
    let error: unknown
    const start = Date.now()

    try {
      resultValue = await fn.apply(context, args)
    }
    catch (err) {
      error = err
    }

    const end = Date.now()
    if (!envContext) {
      if (error)
        throw error
      return resultValue
    }

    if (isTransformRequestStale(transformRequest)) {
      if (error)
        throw error
      return resultValue
    }

    const result = error
      ? stringifyError(error)
      : typeof resultValue === 'object'
        ? resultValue?.id
        : resultValue

    if (result && result !== id) {
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

    if (error)
      throw error
    return resultValue
  })
}
