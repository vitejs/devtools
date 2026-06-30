import type { AgentAnalysisContext, AnalysisCategory, AnalysisInsight, AnalysisReport, BuildAnalysisInput } from '../context'
import { getPackageMeta } from '../../rpc/functions/rolldown-get-packages'
import {
  createSessionReport,
  createSessionStats,
  getAssetScope,
  getChunkSize,
} from '../context'
import {
  clampLimit,
  percentage,
  sortByNumberDesc,
  sumBy,
} from '../utils'

function getIssueCategory(issue: BuildAnalysisInput['issue']): AnalysisCategory | undefined {
  if (issue === 'slow-build')
    return 'build-time'
  if (issue === 'large-bundle')
    return 'bundle-size'
  if (issue === 'unexpected-dependency' || issue === 'dependency-duplication')
    return 'dependency'
  if (issue === 'chunking')
    return 'chunking'
}

function prioritizeInsights(insights: AnalysisInsight[], issue: BuildAnalysisInput['issue']) {
  const category = getIssueCategory(issue)
  if (!category)
    return insights

  return insights.toSorted((a, b) => {
    const aMatch = a.category === category ? 1 : 0
    const bMatch = b.category === category ? 1 : 0
    return bMatch - aMatch
  })
}

export function createBuildAnalysis(context: AgentAnalysisContext) {
  const { manager, resolveSession } = context

  return async function buildAnalysis(input: BuildAnalysisInput = {}): Promise<AnalysisReport> {
    const tool = 'rolldown:build-analysis'
    const limit = clampLimit(input.limit)
    const resolved = await resolveSession(tool, input.session)
    if (resolved.report || !resolved.id)
      return resolved.report!

    const reader = await manager.loadAssetSession(resolved.id)
    const stats = createSessionStats(reader)
    const pluginSummaries = Array.from((await reader.readPluginBuildMetricsSummary()).values())
    const measuredPluginDuration = sumBy(pluginSummaries, item => item.total.duration)
    const transformDuration = sumBy(pluginSummaries, item => item.transform.duration)
    const chunks = Array.from(reader.manager.chunks.values())
    const packageMeta = getPackageMeta(reader)
    const packagesBySize = sortByNumberDesc(packageMeta.packages, pkg => pkg.transformedCodeSize)
    const largestPackage = packagesBySize[0]
    const assetsBySize = sortByNumberDesc(Array.from(reader.manager.assets.values()), asset => asset.size)
    const largestAsset = assetsBySize[0]
    const chunksBySize = sortByNumberDesc(chunks, chunk => getChunkSize(reader, chunk))
    const largestChunk = chunksBySize[0]
    const duplicatedPackages = packageMeta.packages.filter(pkg => pkg.duplicated)

    const insights: AnalysisInsight[] = []

    if (measuredPluginDuration > 0 && transformDuration / measuredPluginDuration >= 0.5) {
      insights.push({
        id: 'build-time:transform-dominates',
        category: 'build-time',
        severity: 'medium',
        title: 'Transform hooks dominate measured plugin time',
        explanation: 'Most measured plugin time is spent in transform hooks, so plugin transforms are the first area to inspect for build-time cost.',
        evidence: [
          { label: 'Transform hook time', value: transformDuration, unit: 'ms' },
          { label: 'Measured plugin time', value: measuredPluginDuration, unit: 'ms' },
          { label: 'Share', value: percentage(transformDuration, measuredPluginDuration), unit: 'ratio' },
        ],
        recommendations: ['Run rolldown:build-time-analysis to inspect top plugins and modules.'],
      })
    }

    if (largestPackage && stats.bundleSize > 0 && largestPackage.transformedCodeSize / stats.bundleSize >= 0.2) {
      insights.push({
        id: `bundle-size:large-package:${largestPackage.name}`,
        category: 'bundle-size',
        severity: 'medium',
        title: `Package "${largestPackage.name}" is a large bundle contributor`,
        explanation: 'A single package accounts for a large share of transformed bundled code.',
        evidence: [
          { label: 'Package size', value: largestPackage.transformedCodeSize, unit: 'bytes', source: { type: 'package', id: largestPackage.id } },
          { label: 'Bundle size', value: stats.bundleSize, unit: 'bytes', source: { type: 'session', id: resolved.id } },
          { label: 'Share', value: percentage(largestPackage.transformedCodeSize, stats.bundleSize), unit: 'ratio' },
        ],
        recommendations: [`Run rolldown:dependency-trace for package "${largestPackage.name}" to find importer paths.`],
      })
    }

    if (largestAsset && stats.bundleSize > 0 && largestAsset.size / stats.bundleSize >= 0.35) {
      insights.push({
        id: `asset:large-output:${largestAsset.filename}`,
        category: 'asset',
        severity: 'low',
        title: `Asset "${largestAsset.filename}" is the largest output`,
        explanation: 'The largest emitted asset takes a substantial share of total output size.',
        evidence: [
          { label: 'Asset size', value: largestAsset.size, unit: 'bytes', source: { type: 'asset', id: largestAsset.filename } },
          { label: 'Scope', value: getAssetScope(largestAsset, new Map(chunks.map(chunk => [chunk.chunk_id, chunk]))) },
        ],
      })
    }

    if (largestChunk) {
      const chunkSize = getChunkSize(reader, largestChunk)
      if (stats.bundleSize > 0 && chunkSize / stats.bundleSize >= 0.35) {
        insights.push({
          id: `chunking:large-chunk:${largestChunk.chunk_id}`,
          category: 'chunking',
          severity: largestChunk.is_initial ? 'medium' : 'low',
          title: `Chunk "${largestChunk.name || largestChunk.chunk_id}" is a large output unit`,
          explanation: largestChunk.is_initial
            ? 'A large initial chunk can increase startup cost because it is needed for initial loading.'
            : 'A large async chunk can still affect the route or interaction that loads it.',
          evidence: [
            { label: 'Chunk size', value: chunkSize, unit: 'bytes', source: { type: 'chunk', id: String(largestChunk.chunk_id) } },
            { label: 'Modules in chunk', value: largestChunk.modules.length, unit: 'count', source: { type: 'chunk', id: String(largestChunk.chunk_id) } },
            { label: 'Initial chunk', value: !!largestChunk.is_initial },
          ],
        })
      }
    }

    if (duplicatedPackages.length) {
      insights.push({
        id: 'dependency:duplicated-packages',
        category: 'dependency',
        severity: duplicatedPackages.length > 3 ? 'medium' : 'low',
        title: 'Duplicated packages were detected',
        explanation: 'Multiple versions or physical copies of the same package family are present in the bundle.',
        evidence: [
          { label: 'Duplicated package entries', value: duplicatedPackages.length, unit: 'count' },
          { label: 'Examples', value: duplicatedPackages.slice(0, limit).map(pkg => `${pkg.name}@${pkg.version}`).join(', ') },
        ],
        recommendations: ['Run rolldown:bundle-size-analysis to inspect dependency contributors.'],
      })
    }

    return createSessionReport(tool, resolved.id, resolved.sessions, {
      answer: insights.length
        ? `The build completed in ${stats.buildDuration}ms with ${insights.length} notable insight(s).`
        : `The build completed in ${stats.buildDuration}ms. No major heuristic insights were detected by the first-pass analysis.`,
      summary: stats,
      insights: prioritizeInsights(insights, input.issue).slice(0, limit),
      limitations: [
        'This is a heuristic first-pass analysis based on Rolldown debug logs.',
        'Tree-shaking effectiveness is inferred from emitted and transformed sizes; unused export removal is not proven by this report.',
      ],
    })
  }
}
