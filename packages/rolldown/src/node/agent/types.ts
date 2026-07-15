import type { RolldownLogsManager } from '../rolldown/logs-manager'

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
