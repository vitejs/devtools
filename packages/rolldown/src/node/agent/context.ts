import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import type { ModuleBuildMetrics, RolldownAssetInfo, RolldownChunkInfo } from '../../shared/types'
import type { BuildInfo, RolldownLogsManager } from '../rolldown/logs-manager'
import { getPackageMeta } from '../rpc/functions/rolldown-get-packages'
import { getLogsManager } from '../rpc/utils'
import { getSessionTimestamp, sortByNumberDesc, sumBy } from './utils'

export const SCHEMA_VERSION = 'rolldown-agent'

export type AnalysisSeverity = 'info' | 'low' | 'medium' | 'high'
export type AnalysisCategory = 'build-time' | 'bundle-size' | 'dependency' | 'chunking' | 'plugin' | 'asset' | 'module'
export type AnalysisUnit = 'ms' | 'bytes' | 'count' | 'percent' | 'ratio'
export type AssetSessionReader = Awaited<ReturnType<RolldownLogsManager['loadAssetSession']>>

export interface EvidenceSource {
  type: 'session' | 'module' | 'package' | 'plugin' | 'chunk' | 'asset'
  id: string
}

export interface EvidenceItem {
  label: string
  value: string | number | boolean | null
  unit?: AnalysisUnit
  source?: EvidenceSource
}

export interface AnalysisInsight {
  id: string
  category: AnalysisCategory
  severity: AnalysisSeverity
  title: string
  explanation: string
  evidence: EvidenceItem[]
  recommendations?: string[]
}

export interface AnalysisSession {
  id: string
  timestamp?: number
}

export interface AnalysisReport {
  schemaVersion: typeof SCHEMA_VERSION
  tool: string
  session?: AnalysisSession
  answer: string
  summary?: object
  insights?: AnalysisInsight[]
  limitations?: string[]
}

export interface BuildAnalysisInput {
  session?: string
  issue?: 'general' | 'slow-build' | 'large-bundle' | 'unexpected-dependency' | 'chunking' | 'dependency-duplication'
  limit?: number
}

export interface BuildTimeAnalysisInput {
  session?: string
  limit?: number
}

export interface BundleSizeAnalysisInput {
  session?: string
  scope?: 'all' | 'initial' | 'async' | 'assets'
  limit?: number
}

export interface DependencyTraceInput {
  session?: string
  target: {
    type: 'module' | 'package' | 'asset'
    id: string
  }
  direction?: 'importers' | 'imports' | 'both'
  maxDepth?: number
  limit?: number
}

export interface BuildComparisonInput {
  baseSession: string
  currentSession: string
  limit?: number
}

export interface ResolvedSession {
  id?: string
  info?: BuildInfo
  sessions: BuildInfo[]
  report?: AnalysisReport
}

export interface SessionStats {
  buildDuration: number
  modules: number
  chunks: number
  assets: number
  plugins: number
  bundleSize: number
  initialJs: number
  packageGraphSupported: boolean
  packages: number
  duplicatedPackages: number
}

export interface ModuleCost {
  id: string
  totalDuration: number
  resolveDuration: number
  loadDuration: number
  transformDuration: number
}

export interface AgentAnalysisContext {
  manager: RolldownLogsManager
  listSessions: () => Promise<BuildInfo[]>
  resolveSession: (tool: string, requested?: string) => Promise<ResolvedSession>
}

export function createEmptyReport(tool: string, answer: string, limitations: string[] = []): AnalysisReport {
  return {
    schemaVersion: SCHEMA_VERSION,
    tool,
    answer,
    limitations,
  }
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

export function getModuleCost(id: string, metrics: ModuleBuildMetrics | undefined): ModuleCost {
  const resolveDuration = sumBy(metrics?.resolve_ids ?? [], item => item.duration)
  const loadDuration = sumBy(metrics?.loads ?? [], item => item.duration)
  const transformDuration = sumBy(metrics?.transforms ?? [], item => item.duration)

  return {
    id,
    totalDuration: resolveDuration + loadDuration + transformDuration,
    resolveDuration,
    loadDuration,
    transformDuration,
  }
}

export function getTopModuleCosts(reader: AssetSessionReader, limit: number) {
  return sortByNumberDesc(
    Array.from(reader.manager.modules.entries())
      .map(([id, module]) => getModuleCost(id, module.build_metrics)),
    item => item.totalDuration,
  ).slice(0, limit)
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

export function createAnalysisContext(context: ViteDevToolsNodeContext): AgentAnalysisContext {
  const manager = getLogsManager(context)

  async function listSessions() {
    const sessions = await manager.list()
    return sessions.toSorted((a, b) => b.timestamp - a.timestamp)
  }

  async function resolveSession(tool: string, requested?: string): Promise<ResolvedSession> {
    const sessions = await listSessions()
    const id = !requested || requested === 'latest'
      ? sessions[0]?.id
      : requested

    if (!id) {
      return {
        sessions,
        report: createEmptyReport(tool, 'No Rolldown sessions were found.', [
          'Run a build with Rolldown devtools output enabled before using this tool.',
        ]),
      }
    }

    const info = sessions.find(session => session.id === id)
    if (!info && requested && requested !== 'latest') {
      return {
        id,
        sessions,
        report: createSessionNotFoundReport(tool, id, sessions),
      }
    }

    return { id, info, sessions }
  }

  return {
    manager,
    listSessions,
    resolveSession,
  }
}
