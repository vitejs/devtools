import type { AgentAnalysisContext, AnalysisInsight, AnalysisReport, BundleSizeAnalysisInput } from '../context'
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

export function createBundleSizeAnalysis(context: AgentAnalysisContext) {
  const { manager, resolveSession } = context

  return async function bundleSizeAnalysis(input: BundleSizeAnalysisInput = {}): Promise<AnalysisReport> {
    const tool = 'rolldown:bundle-size-analysis'
    const limit = clampLimit(input.limit)
    const scope = input.scope ?? 'all'
    const resolved = await resolveSession(tool, input.session)
    if (resolved.report || !resolved.id)
      return resolved.report!

    const reader = await manager.loadAssetSession(resolved.id)
    const stats = createSessionStats(reader)
    const chunks = Array.from(reader.manager.chunks.values())
    const chunkMap = new Map(chunks.map(chunk => [chunk.chunk_id, chunk]))
    const packageMeta = getPackageMeta(reader)
    const analyzedAssets = Array.from(reader.manager.assets.values())
      .filter((asset) => {
        if (scope === 'assets')
          return asset.chunk_id == null
        if (scope === 'initial')
          return asset.chunk_id != null && chunkMap.get(asset.chunk_id)?.is_initial
        if (scope === 'async')
          return asset.chunk_id != null && !chunkMap.get(asset.chunk_id)?.is_initial
        return true
      })
    const analyzedAssetSize = sumBy(analyzedAssets, asset => asset.size)
    const largestAssets = sortByNumberDesc(analyzedAssets, asset => asset.size)
      .slice(0, limit)
      .map(asset => ({
        filename: asset.filename,
        size: asset.size,
        scope: getAssetScope(asset, chunkMap),
        chunkId: asset.chunk_id,
        share: percentage(asset.size, analyzedAssetSize),
      }))
    const largestChunks = sortByNumberDesc(chunks, chunk => getChunkSize(reader, chunk))
      .slice(0, limit)
      .map(chunk => ({
        chunkId: chunk.chunk_id,
        name: chunk.name,
        reason: chunk.reason,
        initial: !!chunk.is_initial,
        modules: chunk.modules.length,
        size: getChunkSize(reader, chunk),
      }))
    const largestPackages = sortByNumberDesc(packageMeta.packages, pkg => pkg.transformedCodeSize)
      .slice(0, limit)
      .map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        version: pkg.version,
        type: pkg.type,
        size: pkg.transformedCodeSize,
        files: pkg.files.length,
        duplicated: !!pkg.duplicated,
        share: percentage(pkg.transformedCodeSize, stats.bundleSize),
      }))
    const duplicatedPackages = packageMeta.packages
      .filter(pkg => pkg.duplicated)
      .map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        version: pkg.version,
        size: pkg.transformedCodeSize,
      }))
      .slice(0, limit)

    const insights: AnalysisInsight[] = []
    const largestPackage = largestPackages[0]
    if (largestPackage) {
      insights.push({
        id: `bundle-size:top-package:${largestPackage.id}`,
        category: 'dependency',
        severity: largestPackage.share >= 0.2 ? 'medium' : 'low',
        title: `Package "${largestPackage.name}" is the largest package contributor`,
        explanation: 'This package contributes the largest transformed code size among package graph entries.',
        evidence: [
          { label: 'Package size', value: largestPackage.size, unit: 'bytes', source: { type: 'package', id: largestPackage.id } },
          { label: 'Share of total emitted assets', value: largestPackage.share, unit: 'ratio' },
          { label: 'Bundled files', value: largestPackage.files, unit: 'count' },
        ],
      })
    }
    if (duplicatedPackages.length) {
      insights.push({
        id: 'bundle-size:duplicated-packages',
        category: 'dependency',
        severity: duplicatedPackages.length > 3 ? 'medium' : 'low',
        title: 'Duplicated package entries increase bundle complexity',
        explanation: 'Duplicated package entries can indicate multiple versions or duplicated physical package copies in the bundled dependency graph.',
        evidence: [
          { label: 'Duplicated package entries', value: duplicatedPackages.length, unit: 'count' },
          { label: 'Examples', value: duplicatedPackages.map(pkg => `${pkg.name}@${pkg.version}`).join(', ') },
        ],
      })
    }

    return createSessionReport(tool, resolved.id, resolved.sessions, {
      answer: `The selected scope contains ${analyzedAssetSize} bytes across ${analyzedAssets.length} asset(s).`,
      summary: {
        scope,
        totalAssetSize: analyzedAssetSize,
        bundleSize: stats.bundleSize,
        initialJs: stats.initialJs,
        topAssets: largestAssets,
        topChunks: largestChunks,
        packageGraphSupported: packageMeta.isSupported,
        topPackages: largestPackages,
        duplicatedPackages,
      },
      insights,
      limitations: [
        'Package sizes are based on transformed module sizes attributed to package graph entries.',
        'Chunk sizes prefer emitted asset size and fall back to summed transformed module size when an emitted asset is unavailable.',
      ],
    })
  }
}
