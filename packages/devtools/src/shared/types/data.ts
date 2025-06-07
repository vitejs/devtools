import type { HookResolveIdCallStart, ModuleImport } from '@rolldown/debug'

export type { ModuleImport }

export interface ModuleListItem {
  id: string
  fileType: string
  imports: ModuleImport[]
  importers: string[]
}

export interface SessionContext {
  id: string
  rootDir: string
  modulesList: ModuleListItem[]
}

export interface ModuleInfo {
  id: string
  loads: RolldownModuleLoadInfo[]
  transforms?: RolldownModuleTransformInfo[]
  resolve_ids: RolldownResolveInfo[]
  imports: ModuleImport[] | null
  importers: string[] | null
}

export interface RolldownResolveInfo {
  type: 'resolve'
  id: string
  plugin_name: string
  plugin_index: number
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
  plugin_index: number
  source: string | null
  timestamp_start: number
  timestamp_end: number
  duration: number
}

export interface RolldownModuleTransformInfo {
  type: 'transform'
  id: string
  plugin_name: string
  plugin_index: number
  source_from: string | null
  source_to: string | null
  diff_added: number
  diff_removed: number
  timestamp_start: number
  timestamp_end: number
  duration: number
}

export interface RolldownModuleTransformNoChanges {
  type: 'transform_no_changes'
  id: string
  count: number
  duration: number
}

export interface RolldownModuleLoadNoChanges {
  type: 'load_no_changes'
  id: string
  count: number
  duration: number
}

export type RolldownModuleFlowNode =
  | RolldownResolveInfo
  | RolldownModuleLoadInfo
  | RolldownModuleLoadNoChanges
  | RolldownModuleTransformInfo
  | RolldownModuleTransformNoChanges
