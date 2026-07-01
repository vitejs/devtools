export interface ViteGraphModulePluginMetric {
  name: string
  transform?: number
  resolveId?: number
}

export interface ViteModuleTransformMetric {
  plugin_name: string
  source_code_size: number
  transformed_code_size: number
  duration: number
}

export interface ViteModuleBuildMetrics {
  resolve_ids: { duration: number }[]
  loads: { duration: number }[]
  transforms: ViteModuleTransformMetric[]
}

export interface ViteModuleImport {
  module_id: string
  kind?: string
}

export interface ViteModuleListItem {
  id: string
  deps: string[]
  importers: string[]
  imports: ViteModuleImport[]
  plugins: ViteGraphModulePluginMetric[]
  virtual: boolean
  totalTime: number
  invokeCount: number
  sourceSize: number
  distSize: number
  path?: string
  buildMetrics?: ViteModuleBuildMetrics
}

export interface ViteModuleDest {
  full: string
  path: string
}

export interface ViteModuleTreeNode {
  name?: string
  children: Record<string, ViteModuleTreeNode>
  items: ViteModuleDest[]
}
