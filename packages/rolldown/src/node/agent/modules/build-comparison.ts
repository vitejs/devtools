import type { AgentAnalysisContext, AnalysisInsight, AnalysisReport, BuildComparisonInput } from '../context'
import { createSessionCompareDetails } from '../../rpc/functions/rolldown-get-session-compare-details'
import { createEmptyReport, createSessionStats, SCHEMA_VERSION } from '../context'
import { clampLimit } from '../utils'

export function createBuildComparison(context: AgentAnalysisContext) {
  const { manager, listSessions } = context

  return async function buildComparison(input: BuildComparisonInput): Promise<AnalysisReport> {
    const tool = 'rolldown:build-comparison'
    const limit = clampLimit(input?.limit)
    const sessions = await listSessions()
    const baseSession = input?.baseSession
    const currentSession = input?.currentSession

    if (!baseSession || !currentSession) {
      return createEmptyReport(tool, 'Both baseSession and currentSession are required.', [
        sessions.length
          ? `Available sessions: ${sessions.map(item => item.id).join(', ')}.`
          : 'No Rolldown sessions were found.',
      ])
    }

    const baseInfo = sessions.find(session => session.id === baseSession)
    const currentInfo = sessions.find(session => session.id === currentSession)
    if (!baseInfo || !currentInfo) {
      return createEmptyReport(tool, 'One or both requested sessions were not found.', [
        `Missing sessions: ${[
          baseInfo ? undefined : baseSession,
          currentInfo ? undefined : currentSession,
        ].filter(Boolean).join(', ')}.`,
      ])
    }

    const [baseReader, currentReader] = await Promise.all([
      manager.loadAssetSession(baseSession),
      manager.loadAssetSession(currentSession),
    ])
    const baseStats = createSessionStats(baseReader)
    const currentStats = createSessionStats(currentReader)
    const compareDetails = await createSessionCompareDetails(baseReader, currentReader)

    const deltas = {
      buildDuration: currentStats.buildDuration - baseStats.buildDuration,
      bundleSize: currentStats.bundleSize - baseStats.bundleSize,
      initialJs: currentStats.initialJs - baseStats.initialJs,
      modules: currentStats.modules - baseStats.modules,
      chunks: currentStats.chunks - baseStats.chunks,
      assets: currentStats.assets - baseStats.assets,
      duplicatedPackages: currentStats.duplicatedPackages - baseStats.duplicatedPackages,
    }

    const insights: AnalysisInsight[] = []
    if (deltas.buildDuration !== 0) {
      insights.push({
        id: 'comparison:build-duration',
        category: 'build-time',
        severity: deltas.buildDuration > 0 ? 'medium' : 'info',
        title: deltas.buildDuration > 0 ? 'Build duration increased' : 'Build duration decreased',
        explanation: 'The overall build duration changed between the selected sessions.',
        evidence: [
          { label: 'Previous build duration', value: baseStats.buildDuration, unit: 'ms', source: { type: 'session', id: baseSession } },
          { label: 'Current build duration', value: currentStats.buildDuration, unit: 'ms', source: { type: 'session', id: currentSession } },
          { label: 'Delta', value: deltas.buildDuration, unit: 'ms' },
        ],
      })
    }
    if (deltas.bundleSize !== 0) {
      insights.push({
        id: 'comparison:bundle-size',
        category: 'bundle-size',
        severity: deltas.bundleSize > 0 ? 'medium' : 'info',
        title: deltas.bundleSize > 0 ? 'Bundle size increased' : 'Bundle size decreased',
        explanation: 'Total emitted asset size changed between the selected sessions.',
        evidence: [
          { label: 'Previous bundle size', value: baseStats.bundleSize, unit: 'bytes', source: { type: 'session', id: baseSession } },
          { label: 'Current bundle size', value: currentStats.bundleSize, unit: 'bytes', source: { type: 'session', id: currentSession } },
          { label: 'Delta', value: deltas.bundleSize, unit: 'bytes' },
        ],
      })
    }

    const topAssets = compareDetails.assets.slice(0, limit)
    const topChunks = compareDetails.chunks.slice(0, limit)
    const topPackages = compareDetails.packages.slice(0, limit)
    const topPlugins = compareDetails.plugins.slice(0, limit)

    return {
      schemaVersion: SCHEMA_VERSION,
      tool,
      answer: `Compared "${baseSession}" to "${currentSession}". Bundle size delta: ${deltas.bundleSize} bytes. Build duration delta: ${deltas.buildDuration}ms.`,
      summary: {
        previous: {
          session: baseSession,
          timestamp: baseInfo.timestamp,
          ...baseStats,
        },
        current: {
          session: currentSession,
          timestamp: currentInfo.timestamp,
          ...currentStats,
        },
        deltas,
        topAssets,
        topChunks,
        topPackages,
        topPlugins,
        sessionStats: compareDetails.sessionStats,
      },
      insights: insights.slice(0, limit),
      limitations: [
        'Asset and chunk matching normalizes hashed filenames where possible, but renamed or heavily restructured outputs may still appear as added and removed items.',
        'Plugin comparison uses recorded hook durations and call counts; non-plugin build work is represented only in total build duration.',
      ],
    }
  }
}
