import type { Plugin } from 'vite'
import type { ViteInspectEnvironmentContext } from './context'
import type {
  ViteInspectPluginCallInfo,
  ViteInspectPluginDetails,
  ViteInspectPluginMetric,
} from './types'

export async function getPluginMetrics(ctx: ViteInspectEnvironmentContext): Promise<ViteInspectPluginMetric[]> {
  const map: Record<string, ViteInspectPluginMetric> = {}
  const defaultMetricInfo = () => ({
    transform: {
      invokeCount: 0,
      totalTime: 0,
    },
    resolveId: {
      invokeCount: 0,
      totalTime: 0,
    },
  })

  ctx.env.getTopLevelConfig().plugins.forEach((plugin: Plugin, pluginId) => {
    map[pluginId] = {
      ...defaultMetricInfo(),
      name: plugin.name,
      plugin_id: pluginId,
      enforce: plugin.enforce,
    }
  })

  for (const row of await ctx.inspectContext.store.getPluginTransformMetrics(ctx.scope)) {
    const key = row.pluginId == null || row.pluginId < 0 ? row.pluginName : String(row.pluginId)
    map[key] ||= {
      ...defaultMetricInfo(),
      name: row.pluginName,
      plugin_id: row.pluginId,
    }
    map[key].transform.totalTime += row.totalTime
    map[key].transform.invokeCount += row.invokeCount
  }

  for (const row of await ctx.inspectContext.store.getPluginResolveIdMetrics(ctx.scope)) {
    const key = row.pluginId == null || row.pluginId < 0 ? row.pluginName : String(row.pluginId)
    map[key] ||= {
      ...defaultMetricInfo(),
      name: row.pluginName,
      plugin_id: row.pluginId,
    }
    map[key].resolveId.totalTime += row.totalTime
    map[key].resolveId.invokeCount += row.invokeCount
  }

  return Object.values(map).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name))
}

export async function getPluginDetails(
  ctx: ViteInspectEnvironmentContext,
  pluginId: number,
): Promise<ViteInspectPluginDetails> {
  const plugin = ctx.env.getTopLevelConfig().plugins[pluginId]
  const calls = await withGraphModuleIds(ctx, await ctx.inspectContext.store.getPluginCalls(ctx.scope, pluginId))
  return {
    plugin_name: plugin?.name ?? calls[0]?.plugin_name ?? '',
    plugin_id: pluginId,
    calls,
    resolveIdMetrics: calls.filter(call => call.type === 'resolve'),
    loadMetrics: calls.filter(call => call.type === 'load'),
    transformMetrics: calls.filter(call => call.type === 'transform'),
  }
}

async function withGraphModuleIds(
  ctx: ViteInspectEnvironmentContext,
  calls: ViteInspectPluginCallInfo[],
): Promise<ViteInspectPluginCallInfo[]> {
  const resolveGraphModuleId = await ctx.getGraphModuleIdResolver()

  return calls.map(call => ({
    ...call,
    graphModuleId: resolveGraphModuleId(call.module),
  }))
}
