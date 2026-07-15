import type { RolldownAssetInfo, RolldownChunkInfo } from '../../shared/types'
import type { BuildInfo } from '../rolldown/logs-manager'
import type { AnalysisReport, AssetSessionReader, SessionStats } from './types'
import { getPackageMeta } from '../rpc/functions/rolldown-get-packages'
import { SCHEMA_VERSION } from './types'

const DEFAULT_LIMIT = 5
const MAX_LIMIT = 200
const DEFAULT_TRACE_DEPTH = 8
const MAX_TRACE_DEPTH = 100

export function clampLimit(limit: unknown, fallback = DEFAULT_LIMIT) {
  if (typeof limit !== 'number' || !Number.isFinite(limit))
    return fallback
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit)))
}

export function clampDepth(depth: unknown) {
  if (typeof depth !== 'number' || !Number.isFinite(depth))
    return DEFAULT_TRACE_DEPTH
  return Math.min(MAX_TRACE_DEPTH, Math.max(1, Math.floor(depth)))
}

export function sortByNumberDesc<T>(items: T[], getValue: (item: T) => number) {
  return items.toSorted((a, b) => getValue(b) - getValue(a))
}

export function sumBy<T>(items: Iterable<T>, getValue: (item: T) => number) {
  let total = 0
  for (const item of items) {
    total += getValue(item)
  }
  return total
}

export function percentage(value: number, total: number) {
  return total > 0 ? value / total : 0
}

export function getSessionTimestamp(sessions: BuildInfo[], id: string) {
  return sessions.find(session => session.id === id)?.timestamp
}

export function createEmptyReport(tool: string, answer: string, limitations: string[] = []): AnalysisReport {
  return {
    schemaVersion: SCHEMA_VERSION,
    tool,
    answer,
    limitations,
  }
}

export function createSessionReport(
  tool: string,
  session: string,
  sessions: BuildInfo[],
  data: Omit<AnalysisReport, 'schemaVersion' | 'tool' | 'session'>,
): AnalysisReport {
  return {
    schemaVersion: SCHEMA_VERSION,
    tool,
    session: {
      id: session,
      timestamp: getSessionTimestamp(sessions, session),
    },
    ...data,
  }
}

export function createSessionNotFoundReport(tool: string, session: string, sessions: BuildInfo[]): AnalysisReport {
  return createEmptyReport(
    tool,
    `Rolldown session "${session}" was not found.`,
    [
      sessions.length
        ? `Available sessions: ${sessions.map(item => item.id).join(', ')}.`
        : 'No Rolldown sessions were found. Run a build with Rolldown devtools output enabled first.',
    ],
  )
}

export function getBuildDuration(reader: AssetSessionReader) {
  return Math.max(0, reader.manager.build_end_time - reader.manager.build_start_time)
}

export function getAssetScope(asset: RolldownAssetInfo, chunks: Map<number, RolldownChunkInfo>) {
  if (asset.chunk_id == null)
    return 'static'
  return chunks.get(asset.chunk_id)?.is_initial ? 'initial' : 'async'
}

export function getModuleTransformedSize(reader: AssetSessionReader, id: string) {
  const transforms = reader.manager.modules.get(id)?.build_metrics?.transforms
  return transforms?.at(-1)?.transformed_code_size ?? 0
}

export function getChunkSize(reader: AssetSessionReader, chunk: RolldownChunkInfo) {
  const asset = reader.manager.chunkAssetMap.get(chunk.chunk_id)
  if (asset)
    return asset.size

  return chunk.modules.reduce((total, id) => total + getModuleTransformedSize(reader, id), 0)
}

export function createSessionStats(reader: AssetSessionReader): SessionStats {
  const assets = Array.from(reader.manager.assets.values())
  const chunks = Array.from(reader.manager.chunks.values())
  const initialChunkIds = new Set(chunks.filter(chunk => chunk.is_initial).map(chunk => chunk.chunk_id))
  const packageMeta = getPackageMeta(reader)

  return {
    buildDuration: getBuildDuration(reader),
    modules: reader.manager.modules.size,
    chunks: chunks.length,
    assets: assets.length,
    plugins: reader.meta?.plugins?.length ?? 0,
    bundleSize: sumBy(assets, asset => asset.size),
    initialJs: sumBy(assets.filter(asset => asset.chunk_id != null && initialChunkIds.has(asset.chunk_id)), asset => asset.size),
    packageGraphSupported: packageMeta.isSupported,
    packages: packageMeta.packages.length,
    duplicatedPackages: packageMeta.packages.filter(pkg => pkg.duplicated).length,
  }
}
