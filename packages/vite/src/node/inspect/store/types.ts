import type {
  ViteInspectErrorInfo,
  ViteInspectPluginCallInfo,
  ViteInspectResolveIdInfo,
  ViteInspectTransformInfo,
} from '../types'

export interface ViteInspectStoreOptions {
  filename?: string
  maxBatchItems?: number
  maxBatchBytes?: number
}

export interface ViteInspectStoreStats {
  maxBatchItems: number
  maxBatchBytes: number
  queuedItems: number
  queuedBytes: number
  inFlightItems: number
  peakQueuedItems: number
  peakQueuedBytes: number
  writeBatches: number
}

export interface ViteInspectPayloadRange {
  offset: number
  length: number
}

export interface StoredViteInspectTransformInfo {
  name: string
  pluginId?: number
  hasResult: boolean
  result?: ViteInspectPayloadRange
  resultSize: number
  start: number
  end: number
  order?: string
  sourcemaps?: ViteInspectPayloadRange
  error?: ViteInspectErrorInfo
}

export interface ViteInspectTransformListItem {
  moduleId: string
  publicModuleId: string
  name: string
  pluginId?: number
  hasResult: boolean
  resultSize: number
  start: number
  end: number
  invokeCount: number
}

export interface ViteInspectResolveIdItem {
  sourceId: string
  sourcePublicId: string
  result: string
  resultPublicId: string
  name: string
  pluginId?: number
  start: number
  end: number
}

export interface ViteInspectPluginMetricItem {
  pluginId?: number
  pluginName: string
  invokeCount: number
  totalTime: number
}

export interface ViteInspectStore {
  recordTransform: (
    scope: string,
    moduleId: string,
    publicModuleId: string,
    info: ViteInspectTransformInfo,
    preTransformCode: string,
    pluginCall?: ViteInspectPluginCallInfo,
  ) => void
  recordLoad: (
    scope: string,
    moduleId: string,
    publicModuleId: string,
    info: ViteInspectTransformInfo,
    pluginCall?: ViteInspectPluginCallInfo,
  ) => void
  recordResolveId: (
    scope: string,
    sourceId: string,
    sourcePublicId: string,
    info: ViteInspectResolveIdInfo,
    resultPublicId: string,
    pluginCall?: ViteInspectPluginCallInfo,
  ) => void
  recordPluginCall: (
    scope: string,
    info: ViteInspectPluginCallInfo,
  ) => void
  invalidate: (scope: string, moduleId: string, publicModuleId: string) => void
  clearScope: (scope: string) => void
  getTransformList: (scope: string) => Promise<ViteInspectTransformListItem[]>
  getResolveIdList: (scope: string) => Promise<ViteInspectResolveIdItem[]>
  getPluginTransformMetrics: (scope: string) => Promise<ViteInspectPluginMetricItem[]>
  getPluginResolveIdMetrics: (scope: string) => Promise<ViteInspectPluginMetricItem[]>
  getModuleTransforms: (scope: string, moduleId: string) => Promise<ViteInspectTransformInfo[]>
  getPluginCalls: (scope: string, pluginId: number) => Promise<ViteInspectPluginCallInfo[]>
  getFirstResolveResult: (scope: string, sourceId: string) => Promise<string | undefined>
  findModuleId: (scope: string, publicModuleId: string) => Promise<string | undefined>
  getModuleIds: (scope: string) => Promise<string[]>
  getStats: () => ViteInspectStoreStats
  flush: () => Promise<void>
  close: () => Promise<void>
}

export type QueuedWrite
  = | {
    operation: 'recordTransform'
    scope: string
    moduleId: string
    publicModuleId: string
    info: ViteInspectTransformInfo
    preTransformCode: string
    pluginCall?: ViteInspectPluginCallInfo
  }
  | {
    operation: 'recordLoad'
    scope: string
    moduleId: string
    publicModuleId: string
    info: ViteInspectTransformInfo
    pluginCall?: ViteInspectPluginCallInfo
  }
  | {
    operation: 'recordResolveId'
    scope: string
    sourceId: string
    sourcePublicId: string
    info: ViteInspectResolveIdInfo
    resultPublicId: string
    pluginCall?: ViteInspectPluginCallInfo
  }
  | {
    operation: 'recordPluginCall'
    scope: string
    info: ViteInspectPluginCallInfo
  }
  | {
    operation: 'invalidate'
    scope: string
    moduleId: string
    publicModuleId: string
  }
  | {
    operation: 'clearScope'
    scope: string
  }

export interface PendingWrite {
  estimatedBytes: number
  write: QueuedWrite
}
