import type { Asset as AssetInfo, Chunk as ChunkInfo, HookResolveIdCallStart, ModuleImport, PluginItem, SessionMeta } from '@rolldown/debug'

export type { ModuleImport }

export interface BuildMetrics {
  plugin_name: string
  plugin_id: number
  duration: number
  source_code_size?: number
  transformed_code_size?: number
  timestamp_start: number
  timestamp_end: number
}

export interface ModuleBuildMetrics {
  resolve_ids: RolldownResolveInfo[]
  loads: RolldownModuleLoadInfo[]
  transforms: Array<Omit<RolldownModuleTransformInfo, 'diff_added' | 'diff_removed'> & { source_code_size: number, transformed_code_size: number }>
}

export interface PluginBuildInfo {
  type: 'resolve' | 'load' | 'transform'
  id: string
  duration: number
  plugin_id: number
  plugin_name: string
  module: string
  timestamp_start: number
  timestamp_end: number
}

export interface PluginBuildMetrics {
  plugin_name: string
  plugin_id: number
  calls: PluginBuildInfo[]
}

export type { PluginItem }

export interface ModuleListItem {
  id: string
  path?: string
  fileType: string
  imports: ModuleImport[]
  importers: string[]
  buildMetrics: ModuleBuildMetrics | undefined
}

export interface SessionContext {
  id: string
  meta: SessionMeta
  modulesList: ModuleListItem[]
  buildDuration: number
}

export interface ModuleInfo {
  id: string
  loads: RolldownModuleLoadInfo[]
  transforms: RolldownModuleTransformInfo[]
  resolve_ids: RolldownResolveInfo[]
  chunks: RolldownChunkInfo[]
  imports: ModuleImport[] | null
  importers: string[] | null
  assets: RolldownAssetInfo[]
  build_metrics: ModuleBuildMetrics
}

export interface ModuleDest {
  full: string
  path: string
}
export interface ModuleTreeNode {
  name?: string
  children: Record<string, ModuleTreeNode>
  items: ModuleDest[]
}

export type RolldownPluginBuildMetrics = PluginBuildMetrics & {
  resolveIdMetrics: PluginBuildInfo[]
  loadMetrics: PluginBuildInfo[]
  transformMetrics: PluginBuildInfo[]
}

export interface RolldownResolveInfo {
  type: 'resolve'
  id: string
  plugin_name: string
  plugin_id: number
  importer: string | null
  module_request: string
  import_kind: HookResolveIdCallStart['import_kind']
  resolved_id: string | null
  timestamp_start: number
  timestamp_end: number
  duration: number
}

export interface RolldownModuleLoadInfo {
  type: 'load'
  id: string
  plugin_name: string
  plugin_id: number
  content: string | null
  timestamp_start: number
  timestamp_end: number
  duration: number
}

export interface RolldownModuleTransformInfo {
  type: 'transform'
  id: string
  plugin_name: string
  plugin_id: number
  content_from: string | null
  content_to: string | null
  diff_added: number
  diff_removed: number
  timestamp_start: number
  timestamp_end: number
  duration: number
}

export interface RolldownModuleNoChanges {
  type: 'no_changes_collapsed'
  id: string
  count: number
  duration: number
}

export interface RolldownModuleNoChangesHide {
  type: 'no_changes_hide'
  id: string
  count: number
  duration: number
}

export interface RolldownChunkInfo extends ChunkInfo {
  type: 'chunk'
}

export interface RolldownAssetInfo extends AssetInfo {
  type: 'asset'
}

export type RolldownModuleFlowNode
  = | RolldownResolveInfo
    | RolldownModuleLoadInfo
    | RolldownModuleNoChanges
    | RolldownModuleNoChangesHide
    | RolldownModuleTransformInfo
    | RolldownChunkInfo
    | RolldownAssetInfo
