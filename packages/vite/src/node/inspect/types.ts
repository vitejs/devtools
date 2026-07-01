export interface ViteInspectQuery {
  vite: string
  env: string
}

export interface ViteInspectErrorInfo {
  message: string
  stack: string[]
  raw?: unknown
}

export interface ViteInspectTransformInfo {
  name: string
  plugin_id?: number
  result?: string | null
  start: number
  end: number
  order?: string
  sourcemaps?: unknown
  error?: ViteInspectErrorInfo
}

export interface ViteInspectResolveIdInfo {
  name: string
  plugin_id?: number
  result: string
  start: number
  end: number
  error?: unknown
}

export interface ViteInspectModulePluginMetric {
  name: string
  transform?: number
  resolveId?: number
}

export interface ViteInspectModuleInfo {
  id: string
  deps: string[]
  importers: string[]
  plugins: ViteInspectModulePluginMetric[]
  virtual: boolean
  totalTime: number
  invokeCount: number
  sourceSize: number
  distSize: number
}

export interface ViteInspectPluginMetric {
  name: string
  plugin_id?: number
  enforce?: 'pre' | 'post'
  transform: {
    invokeCount: number
    totalTime: number
  }
  resolveId: {
    invokeCount: number
    totalTime: number
  }
}

export interface ViteInspectModuleTransformInfo {
  resolvedId: string
  transforms: ViteInspectTransformInfo[]
}

export type ViteInspectPluginCallType = 'resolve' | 'load' | 'transform'

export interface ViteInspectPluginCallInfo {
  type: ViteInspectPluginCallType
  id: string
  duration: number
  plugin_id: number
  plugin_name: string
  module: string
  timestamp_start: number
  timestamp_end: number
  unchanged?: boolean
}

export interface ViteInspectPluginDetails {
  plugin_name: string
  plugin_id: number
  calls: ViteInspectPluginCallInfo[]
  resolveIdMetrics: ViteInspectPluginCallInfo[]
  loadMetrics: ViteInspectPluginCallInfo[]
  transformMetrics: ViteInspectPluginCallInfo[]
}

export interface ViteInspectMiddlewareMetric {
  self: number
  total: number
  name: string
}

export interface ViteInspectServerMetrics {
  middleware: Record<string, ViteInspectMiddlewareMetric[]>
}
