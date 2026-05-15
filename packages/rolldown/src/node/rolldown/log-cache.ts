import type { SessionMeta } from '@rolldown/debug'
import type { Stats } from 'node:fs'
import type { ModuleBuildMetrics, PluginBuildMetrics } from '../../shared/types'
import type { RolldownEventsManager } from './events-manager'
import fs from 'node:fs/promises'
import { basename, dirname, join } from 'pathe'

export const ROLLDOWN_LOG_CACHE_DIR = '.cache'
export const ROLLDOWN_LOG_SESSION_SUMMARY_CACHE_FILENAME = 'session-summary.json'
export const ROLLDOWN_LOG_READER_INDEX_CACHE_FILENAME = 'reader-index.json'
export const ROLLDOWN_LOG_PACKAGE_SUMMARY_CACHE_FILENAME = 'package-summary.json'
export const ROLLDOWN_LOG_PLUGIN_SUMMARY_CACHE_FILENAME = 'plugin-summary.json'
export const ROLLDOWN_LOG_MODULE_METRICS_SUMMARY_CACHE_FILENAME = 'module-metrics-summary.json'
const ROLLDOWN_LOG_CACHE_VERSION = 1

type ManagerSnapshot = ReturnType<RolldownEventsManager['snapshot']>

export interface LineLocation {
  offset: number
  length: number
}

export interface IndexedHookCall {
  start: LineLocation
  end: LineLocation
}

export interface ModuleEventIndex {
  resolveIds: Map<string, IndexedHookCall>
  loads: Map<string, IndexedHookCall>
  transforms: Map<string, IndexedHookCall>
}

export interface PendingHookCallStart {
  module?: string
  location: LineLocation
}

export interface RolldownLogCacheState {
  lastBytes: number
  lastTimestamp: number
  lineNumber: number
  moduleEventIndex: Map<string, ModuleEventIndex>
  stringRefIndex: Map<string, LineLocation>
  pendingHookCallStarts: Map<string, PendingHookCallStart>
  assetsReadyLocations: LineLocation[]
  meta: SessionMeta | undefined
  readonly manager: RolldownEventsManager
  packageSummaryTimestamp: number
  metricsSummaryOnly: boolean
}

interface RolldownLogCacheFileContent<T> {
  version: number
  log: {
    size: number
    mtime: number
  }
  data: T
}

interface RolldownSessionSummaryCacheSnapshot {
  reader: {
    lastBytes: number
    lastTimestamp: number
    lineNumber: number
  }
  meta: SessionMeta | undefined
  manager: Pick<ManagerSnapshot, 'eventCount' | 'lastEvent' | 'chunks' | 'modules' | 'build_start_time' | 'build_end_time'>
}

interface RolldownModuleMetricsSummaryCacheSnapshot {
  metrics: Array<[string, ModuleBuildMetrics]>
}

interface PluginMetricSummary {
  count: number
  duration: number
}

interface PluginBuildMetricsSummary {
  plugin_id: number
  plugin_name: string
  total: PluginMetricSummary
  resolve: PluginMetricSummary
  load: PluginMetricSummary
  transform: PluginMetricSummary
}

interface RolldownPluginSummaryCacheSnapshot {
  plugins: Array<[number, PluginBuildMetricsSummary]>
}

interface RolldownReaderIndexCacheSnapshot {
  reader: {
    lastBytes: number
    lastTimestamp: number
    moduleEventIndex: Array<[string, {
      resolveIds: Array<[string, IndexedHookCall]>
      loads: Array<[string, IndexedHookCall]>
      transforms: Array<[string, IndexedHookCall]>
    }]>
    stringRefIndex: Array<[string, LineLocation]>
    pendingHookCallStarts: Array<[string, PendingHookCallStart]>
    assetsReadyLocations: LineLocation[]
  }
}

interface RolldownPackageSummaryCacheSnapshot {
  packageSummaryTimestamp: number
  manager: ManagerSnapshot
}

class RolldownLogCacheFile<T> {
  private constructor(
    readonly filepath: string,
  ) {
  }

  static forLogFile<T>(logFilepath: string, filename: string) {
    if (basename(logFilepath) !== 'logs.json')
      return undefined

    return new RolldownLogCacheFile<T>(join(dirname(logFilepath), ROLLDOWN_LOG_CACHE_DIR, filename))
  }

  async read(stat: Stats): Promise<T | undefined> {
    try {
      const cache = JSON.parse(await fs.readFile(this.filepath, 'utf8')) as RolldownLogCacheFileContent<T>
      if (!this.matches(stat, cache))
        return undefined

      return cache.data
    }
    catch {
      return undefined
    }
  }

  async write(stat: Stats, data: T) {
    try {
      const temporaryFilepath = `${this.filepath}.tmp`
      await fs.mkdir(dirname(this.filepath), { recursive: true })
      await fs.writeFile(temporaryFilepath, JSON.stringify(this.createFile(stat, data)), 'utf8')
      await fs.rename(temporaryFilepath, this.filepath)
    }
    catch {
      // The cache is best-effort. The reader can always rebuild from logs.json.
    }
  }

  private createFile(stat: Stats, data: T): RolldownLogCacheFileContent<T> {
    return {
      version: ROLLDOWN_LOG_CACHE_VERSION,
      log: {
        size: stat.size,
        mtime: stat.mtime.getTime(),
      },
      data,
    }
  }

  private matches(stat: Stats, cache: RolldownLogCacheFileContent<T>) {
    return cache.version === ROLLDOWN_LOG_CACHE_VERSION
      && cache.log.size === stat.size
      && cache.log.mtime === stat.mtime.getTime()
  }
}

function createMetricSummary(): PluginMetricSummary {
  return {
    count: 0,
    duration: 0,
  }
}

function addMetricSummary(summary: PluginMetricSummary, duration: number) {
  summary.count += 1
  summary.duration += duration
}

function compactModuleBuildMetrics(metrics: ModuleBuildMetrics): ModuleBuildMetrics {
  const resolveDuration = metrics.resolve_ids.reduce((total, item) => total + item.duration, 0)
  const loadDuration = metrics.loads.reduce((total, item) => total + item.duration, 0)
  const transformDuration = metrics.transforms.reduce((total, item) => total + item.duration, 0)

  const resolve_ids = metrics.resolve_ids.length
    ? [{
        ...metrics.resolve_ids[0]!,
        id: '',
        duration: resolveDuration,
        timestamp_start: metrics.resolve_ids[0]!.timestamp_start,
        timestamp_end: metrics.resolve_ids.at(-1)!.timestamp_end,
      }]
    : []

  const loads = metrics.loads.length
    ? [{
        ...metrics.loads[0]!,
        id: '',
        content: null,
        duration: loadDuration,
        timestamp_start: metrics.loads[0]!.timestamp_start,
        timestamp_end: metrics.loads.at(-1)!.timestamp_end,
      }]
    : []

  const transformsByPlugin = new Map<number, ModuleBuildMetrics['transforms'][number]>()
  let finalTransformedCodeSize = 0
  for (const transform of metrics.transforms) {
    if (transform.transformed_code_size)
      finalTransformedCodeSize = transform.transformed_code_size

    if (!transform.transformed_code_size || transform.source_code_size === transform.transformed_code_size)
      continue

    const item = transformsByPlugin.get(transform.plugin_id)
    if (item) {
      item.duration += transform.duration
      item.timestamp_end = transform.timestamp_end
      item.transformed_code_size = transform.transformed_code_size
      continue
    }

    transformsByPlugin.set(transform.plugin_id, {
      ...transform,
      id: '',
      content_from: null,
      content_to: null,
    })
  }

  const transforms = Array.from(transformsByPlugin.values())
  const changedDuration = transforms.reduce((total, item) => total + item.duration, 0)
  const remainingDuration = transformDuration - changedDuration
  if (remainingDuration > 0 && metrics.transforms.length) {
    transforms.push({
      ...metrics.transforms[0]!,
      id: '',
      plugin_name: '',
      plugin_id: 0,
      content_from: null,
      content_to: null,
      source_code_size: 0,
      transformed_code_size: 0,
      duration: remainingDuration,
      timestamp_start: metrics.transforms[0]!.timestamp_start,
      timestamp_end: metrics.transforms.at(-1)!.timestamp_end,
    })
  }

  if (finalTransformedCodeSize && metrics.transforms.length) {
    transforms.push({
      ...metrics.transforms.at(-1)!,
      id: '',
      plugin_name: '',
      plugin_id: 0,
      content_from: null,
      content_to: null,
      source_code_size: finalTransformedCodeSize,
      transformed_code_size: finalTransformedCodeSize,
      duration: 0,
    })
  }

  return {
    resolve_ids,
    loads,
    transforms,
  }
}

function createPluginBuildMetricsSummary(metrics: PluginBuildMetrics): PluginBuildMetricsSummary {
  const summary = {
    plugin_id: metrics.plugin_id,
    plugin_name: metrics.plugin_name,
    total: createMetricSummary(),
    resolve: createMetricSummary(),
    load: createMetricSummary(),
    transform: createMetricSummary(),
  }

  for (const call of metrics.calls) {
    addMetricSummary(summary.total, call.duration)
    if (call.type === 'resolve')
      addMetricSummary(summary.resolve, call.duration)
    else if (call.type === 'load')
      addMetricSummary(summary.load, call.duration)
    else if (call.type === 'transform')
      addMetricSummary(summary.transform, call.duration)
  }

  return summary
}

export class RolldownLogCache {
  private sessionSummaryCache: RolldownLogCacheFile<RolldownSessionSummaryCacheSnapshot> | undefined
  private moduleMetricsSummaryCache: RolldownLogCacheFile<RolldownModuleMetricsSummaryCacheSnapshot> | undefined
  private pluginSummaryCache: RolldownLogCacheFile<RolldownPluginSummaryCacheSnapshot> | undefined
  private readerIndexCache: RolldownLogCacheFile<RolldownReaderIndexCacheSnapshot> | undefined
  private packageSummaryCache: RolldownLogCacheFile<RolldownPackageSummaryCacheSnapshot> | undefined
  private completeSessionWriteAttempted = false
  private summaryWriteAttempted = false
  private packageSummaryWriteAttempted = false

  constructor(logFilepath: string, options: { completeSession: boolean }) {
    if (options.completeSession) {
      this.sessionSummaryCache = RolldownLogCacheFile.forLogFile(logFilepath, ROLLDOWN_LOG_SESSION_SUMMARY_CACHE_FILENAME)
      this.moduleMetricsSummaryCache = RolldownLogCacheFile.forLogFile(logFilepath, ROLLDOWN_LOG_MODULE_METRICS_SUMMARY_CACHE_FILENAME)
      this.pluginSummaryCache = RolldownLogCacheFile.forLogFile(logFilepath, ROLLDOWN_LOG_PLUGIN_SUMMARY_CACHE_FILENAME)
      this.readerIndexCache = RolldownLogCacheFile.forLogFile(logFilepath, ROLLDOWN_LOG_READER_INDEX_CACHE_FILENAME)
    }
    this.packageSummaryCache = RolldownLogCacheFile.forLogFile(logFilepath, ROLLDOWN_LOG_PACKAGE_SUMMARY_CACHE_FILENAME)
  }

  shouldWriteCompleteSession() {
    return !this.completeSessionWriteAttempted
  }

  shouldWritePackageSummary() {
    return !this.packageSummaryWriteAttempted
  }

  shouldWriteSummary() {
    return !this.summaryWriteAttempted
  }

  resetCompleteSessionWriteAttempt() {
    this.completeSessionWriteAttempted = false
    this.summaryWriteAttempted = false
  }

  resetSummaryWriteAttempt() {
    this.summaryWriteAttempted = false
  }

  resetPackageSummaryWriteAttempt() {
    this.packageSummaryWriteAttempted = false
  }

  async restoreCompleteSession(stat: Stats, state: RolldownLogCacheState) {
    if (state.lastBytes || state.manager.eventCount)
      return false

    const [sessionSummaryCache, moduleMetricsCache, pluginSummaryCacheExists, indexCache] = await Promise.all([
      this.sessionSummaryCache?.read(stat),
      this.moduleMetricsSummaryCache?.read(stat),
      this.pluginSummaryCache?.read(stat),
      this.readerIndexCache?.read(stat),
    ])
    if (!sessionSummaryCache || !moduleMetricsCache || !pluginSummaryCacheExists || !indexCache)
      return false

    if (sessionSummaryCache.reader.lastBytes !== stat.size || indexCache.reader.lastBytes !== stat.size)
      return false

    this.restoreSessionSnapshot(sessionSummaryCache, state, moduleMetricsCache)
    this.restoreReaderIndexSnapshot(indexCache, state)
    this.completeSessionWriteAttempted = true
    this.summaryWriteAttempted = true
    return true
  }

  async restoreSummary(stat: Stats, state: RolldownLogCacheState) {
    if (state.lastBytes || state.manager.eventCount)
      return false

    const [sessionSummaryCache, moduleMetricsCache, _pluginSummaryCache, indexCache] = await Promise.all([
      this.sessionSummaryCache?.read(stat),
      this.moduleMetricsSummaryCache?.read(stat),
      this.pluginSummaryCache?.read(stat),
      this.readerIndexCache?.read(stat),
    ])
    if (!sessionSummaryCache)
      return false

    if (sessionSummaryCache.reader.lastBytes !== stat.size)
      return false

    this.restoreSessionSnapshot(sessionSummaryCache, state, moduleMetricsCache)
    const hasCompleteCache = !!moduleMetricsCache && !!_pluginSummaryCache && !!indexCache
    if (indexCache?.reader.lastBytes === stat.size)
      this.restoreReaderIndexSnapshot(indexCache, state)
    else
      this.clearReaderIndexState(state)
    this.summaryWriteAttempted = true
    this.completeSessionWriteAttempted = hasCompleteCache
    return hasCompleteCache ? 'complete' : 'summary'
  }

  async restorePackageSummary(stat: Stats, state: RolldownLogCacheState) {
    if (state.manager.eventCount)
      return false

    const cache = await this.packageSummaryCache?.read(stat)
    if (!cache)
      return false

    if (cache.packageSummaryTimestamp !== stat.mtime.getTime())
      return false

    this.restorePackageSummarySnapshot(cache, state)
    this.packageSummaryWriteAttempted = true
    return true
  }

  async writeCompleteSession(stat: Stats, state: RolldownLogCacheState) {
    this.completeSessionWriteAttempted = true
    this.summaryWriteAttempted = true
    await Promise.all([
      this.sessionSummaryCache?.write(stat, this.createSessionSummarySnapshot(state)),
      this.moduleMetricsSummaryCache?.write(stat, this.createModuleMetricsSummarySnapshot(state)),
      this.pluginSummaryCache?.write(stat, this.createPluginSummarySnapshot(state)),
      this.readerIndexCache?.write(stat, this.createReaderIndexSnapshot(state)),
    ])
  }

  async writeSummary(stat: Stats, state: RolldownLogCacheState) {
    this.summaryWriteAttempted = true
    await Promise.all([
      this.sessionSummaryCache?.write(stat, this.createSessionSummarySnapshot(state)),
      this.moduleMetricsSummaryCache?.write(stat, this.createModuleMetricsSummarySnapshot(state)),
      this.pluginSummaryCache?.write(stat, this.createPluginSummarySnapshot(state)),
      this.readerIndexCache?.write(stat, this.createReaderIndexSnapshot(state)),
    ])
  }

  async writePackageSummary(stat: Stats, state: RolldownLogCacheState) {
    this.packageSummaryWriteAttempted = true
    await this.packageSummaryCache?.write(stat, this.createPackageSummarySnapshot(state))
  }

  private createSessionSummarySnapshot(state: RolldownLogCacheState): RolldownSessionSummaryCacheSnapshot {
    const manager = state.manager.snapshot()
    return {
      reader: {
        lastBytes: state.lastBytes,
        lastTimestamp: state.lastTimestamp,
        lineNumber: state.lineNumber,
      },
      meta: state.meta,
      manager: {
        eventCount: manager.eventCount,
        lastEvent: manager.lastEvent,
        chunks: manager.chunks,
        modules: manager.modules,
        build_start_time: manager.build_start_time,
        build_end_time: manager.build_end_time,
      },
    }
  }

  private createModuleMetricsSummarySnapshot(state: RolldownLogCacheState): RolldownModuleMetricsSummaryCacheSnapshot {
    const manager = state.manager.snapshot()
    return {
      metrics: manager.module_build_metrics.map(([module, metrics]) => [module, compactModuleBuildMetrics(metrics)]),
    }
  }

  private createPluginSummarySnapshot(state: RolldownLogCacheState): RolldownPluginSummaryCacheSnapshot {
    const manager = state.manager.snapshot()
    return {
      plugins: manager.plugin_build_metrics.map(([pluginId, metrics]) => [pluginId, createPluginBuildMetricsSummary(metrics)]),
    }
  }

  private createReaderIndexSnapshot(state: RolldownLogCacheState): RolldownReaderIndexCacheSnapshot {
    return {
      reader: {
        lastBytes: state.lastBytes,
        lastTimestamp: state.lastTimestamp,
        moduleEventIndex: Array.from(state.moduleEventIndex.entries()).map(([module, index]) => [module, {
          resolveIds: Array.from(index.resolveIds.entries()),
          loads: Array.from(index.loads.entries()),
          transforms: Array.from(index.transforms.entries()),
        }]),
        stringRefIndex: Array.from(state.stringRefIndex.entries()),
        pendingHookCallStarts: Array.from(state.pendingHookCallStarts.entries()),
        assetsReadyLocations: state.assetsReadyLocations,
      },
    }
  }

  private createPackageSummarySnapshot(state: RolldownLogCacheState): RolldownPackageSummaryCacheSnapshot {
    return {
      packageSummaryTimestamp: state.packageSummaryTimestamp,
      manager: state.manager.snapshot(),
    }
  }

  private restoreSessionSnapshot(
    session: RolldownSessionSummaryCacheSnapshot,
    state: RolldownLogCacheState,
    moduleMetrics?: RolldownModuleMetricsSummaryCacheSnapshot,
  ) {
    state.lastBytes = session.reader.lastBytes
    state.lastTimestamp = session.reader.lastTimestamp
    state.lineNumber = session.reader.lineNumber
    state.meta = session.meta
    state.metricsSummaryOnly = true
    state.manager.restore({
      eventCount: session.manager.eventCount,
      lastEvent: session.manager.lastEvent,
      chunks: session.manager.chunks,
      modules: session.manager.modules,
      source_refs: [],
      module_build_hook_events: [],
      module_build_metrics: moduleMetrics?.metrics ?? [],
      plugin_build_metrics: [],
      build_start_time: session.manager.build_start_time,
      build_end_time: session.manager.build_end_time,
    })
  }

  private restoreReaderIndexSnapshot(snapshot: RolldownReaderIndexCacheSnapshot, state: RolldownLogCacheState) {
    state.moduleEventIndex = new Map(snapshot.reader.moduleEventIndex.map(([module, item]) => [module, {
      resolveIds: new Map(item.resolveIds),
      loads: new Map(item.loads),
      transforms: new Map(item.transforms),
    }]))
    state.stringRefIndex = new Map(snapshot.reader.stringRefIndex)
    state.pendingHookCallStarts = new Map(snapshot.reader.pendingHookCallStarts)
    state.assetsReadyLocations = snapshot.reader.assetsReadyLocations
  }

  private restorePackageSummarySnapshot(snapshot: RolldownPackageSummaryCacheSnapshot, state: RolldownLogCacheState) {
    state.manager.restore(snapshot.manager)
    state.packageSummaryTimestamp = snapshot.packageSummaryTimestamp
  }

  private clearReaderIndexState(state: RolldownLogCacheState) {
    state.moduleEventIndex = new Map()
    state.stringRefIndex = new Map()
    state.pendingHookCallStarts = new Map()
    state.assetsReadyLocations = []
  }
}
