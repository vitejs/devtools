import type { AgentAnalysisContext, AnalysisInsight, AnalysisReport, BuildTimeAnalysisInput } from '../context'
import {
  createSessionReport,
  createSessionStats,
  getTopModuleCosts,
} from '../context'
import {
  clampLimit,
  percentage,
  sortByNumberDesc,
  sumBy,
} from '../utils'

export function createBuildTimeAnalysis(context: AgentAnalysisContext) {
  const { manager, resolveSession } = context

  return async function buildTimeAnalysis(input: BuildTimeAnalysisInput = {}): Promise<AnalysisReport> {
    const tool = 'rolldown:build-time-analysis'
    const limit = clampLimit(input.limit)
    const resolved = await resolveSession(tool, input.session)
    if (resolved.report || !resolved.id)
      return resolved.report!

    const reader = await manager.loadAssetSession(resolved.id)
    const stats = createSessionStats(reader)
    const pluginSummaries = Array.from((await reader.readPluginBuildMetricsSummary()).values())
    const hookBreakdown = {
      resolve: {
        duration: sumBy(pluginSummaries, item => item.resolve.duration),
        calls: sumBy(pluginSummaries, item => item.resolve.count),
      },
      load: {
        duration: sumBy(pluginSummaries, item => item.load.duration),
        calls: sumBy(pluginSummaries, item => item.load.count),
      },
      transform: {
        duration: sumBy(pluginSummaries, item => item.transform.duration),
        calls: sumBy(pluginSummaries, item => item.transform.count),
      },
    }
    const measuredPluginDuration = hookBreakdown.resolve.duration + hookBreakdown.load.duration + hookBreakdown.transform.duration
    const topPlugins = sortByNumberDesc(pluginSummaries, item => item.total.duration)
      .slice(0, limit)
      .map(plugin => ({
        pluginId: plugin.plugin_id,
        name: plugin.plugin_name,
        totalDuration: plugin.total.duration,
        totalCalls: plugin.total.count,
        resolveDuration: plugin.resolve.duration,
        resolveCalls: plugin.resolve.count,
        loadDuration: plugin.load.duration,
        loadCalls: plugin.load.count,
        transformDuration: plugin.transform.duration,
        transformCalls: plugin.transform.count,
      }))
    const topModules = getTopModuleCosts(reader, limit)

    const insights: AnalysisInsight[] = []
    const topPlugin = topPlugins[0]
    if (topPlugin && measuredPluginDuration > 0) {
      insights.push({
        id: `plugin:top-cost:${topPlugin.pluginId}`,
        category: 'plugin',
        severity: percentage(topPlugin.totalDuration, measuredPluginDuration) >= 0.35 ? 'medium' : 'low',
        title: `Plugin "${topPlugin.name}" has the highest measured hook cost`,
        explanation: 'This plugin accounts for the largest share of measured plugin hook duration.',
        evidence: [
          { label: 'Plugin duration', value: topPlugin.totalDuration, unit: 'ms', source: { type: 'plugin', id: String(topPlugin.pluginId) } },
          { label: 'Plugin calls', value: topPlugin.totalCalls, unit: 'count', source: { type: 'plugin', id: String(topPlugin.pluginId) } },
          { label: 'Share of measured plugin time', value: percentage(topPlugin.totalDuration, measuredPluginDuration), unit: 'ratio' },
        ],
      })
    }

    const topModule = topModules[0]
    if (topModule && topModule.totalDuration > 0) {
      insights.push({
        id: `module:top-build-cost:${topModule.id}`,
        category: 'module',
        severity: 'low',
        title: `Module "${topModule.id}" has the highest measured build cost`,
        explanation: 'This module has the largest combined resolve, load, and transform duration in the current build data.',
        evidence: [
          { label: 'Module duration', value: topModule.totalDuration, unit: 'ms', source: { type: 'module', id: topModule.id } },
          { label: 'Resolve duration', value: topModule.resolveDuration, unit: 'ms' },
          { label: 'Load duration', value: topModule.loadDuration, unit: 'ms' },
          { label: 'Transform duration', value: topModule.transformDuration, unit: 'ms' },
        ],
      })
    }

    return createSessionReport(tool, resolved.id, resolved.sessions, {
      answer: measuredPluginDuration > 0
        ? `Measured plugin hooks took ${measuredPluginDuration}ms. The top plugin is "${topPlugins[0]?.name ?? 'unknown'}".`
        : 'No measured plugin hook duration was found in this session.',
      summary: {
        buildDuration: stats.buildDuration,
        measuredPluginDuration,
        hookBreakdown,
        topPlugins,
        topModules,
      },
      insights,
      limitations: [
        'Build duration and measured plugin hook duration are related but not identical; Rolldown work outside plugin hooks is not attributed to a plugin.',
        'Module cost is based on recorded resolve, load, and transform hook metrics.',
      ],
    })
  }
}
