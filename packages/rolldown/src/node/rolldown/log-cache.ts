import type { SessionMeta } from '@rolldown/debug'
import type { Stats } from 'node:fs'
import type { ModuleBuildMetrics } from '../../shared/types'
import type { PluginBuildMetricsSummary, RolldownEventsManager } from './events-manager'
import fs from 'node:fs/promises'
import { basename, dirname, join } from 'pathe'
import { createPluginBuildMetricsSummary } from './events-manager'
import { decodeReaderIndex, encodeReaderIndex } from './reader-index-codec'

export const ROLLDOWN_LOG_CACHE_DIR = '.cache'
export const ROLLDOWN_LOG_SESSION_SUMMARY_CACHE_FILENAME = 'session-summary.json'
export const ROLLDOWN_LOG_READER_INDEX_CACHE_FILENAME = 'reader-index.bin'
export const ROLLDOWN_LOG_PACKAGE_SUMMARY_CACHE_FILENAME = 'package-summary.json'
export const ROLLDOWN_LOG_PLUGIN_SUMMARY_CACHE_FILENAME = 'plugin-summary.json'
export const ROLLDOWN_LOG_MODULE_METRICS_SUMMARY_CACHE_FILENAME = 'module-metrics-summary.json'
const ROLLDOWN_LOG_CACHE_VERSION = 3

export type { PluginBuildMetricsSummary, PluginMetricSummary } from './events-manager'

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
  manager: Pick<ManagerSnapshot, 'eventCount' | 'lastEvent' | 'chunks' | 'modules' | 'packageGraphReady' | 'packages' | 'build_start_time' | 'build_end_time'>
}

interface RolldownModuleMetricsSummaryCacheSnapshot {
  metrics: Array<[string, ModuleBuildMetrics]>
}

interface RolldownPluginSummaryCacheSnapshot {
  plugins: Array<[number, PluginBuildMetricsSummary]>
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
      await fs.writeFile(temporaryFilepath, await stringifyInSlices(this.createFile(stat, data)), 'utf8')
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

class RolldownReaderIndexCacheFile {
  private constructor(
    readonly filepath: string,
  ) {
  }

  static forLogFile(logFilepath: string) {
    if (basename(logFilepath) !== 'logs.json')
      return undefined

    return new RolldownReaderIndexCacheFile(join(dirname(logFilepath), ROLLDOWN_LOG_CACHE_DIR, ROLLDOWN_LOG_READER_INDEX_CACHE_FILENAME))
  }

  async read(stat: Stats) {
    try {
      return await decodeReaderIndex(await fs.readFile(this.filepath), toLogStat(stat))
    }
    catch {
      return undefined
    }
  }

  async write(stat: Stats, state: RolldownLogCacheState) {
    try {
      const chunks = await encodeReaderIndex(state, toLogStat(stat))
      const temporaryFilepath = `${this.filepath}.tmp`
      await fs.mkdir(dirname(this.filepath), { recursive: true })
      await fs.writeFile(temporaryFilepath, chunks)
      await fs.rename(temporaryFilepath, this.filepath)
    }
    catch {
      // The cache is best-effort. The reader can always rebuild from logs.json.
    }
  }
}

const SNAPSHOT_SLICE_MS = 8

function createYielder() {
  let sliceStart = performance.now()
  return async () => {
    if (performance.now() - sliceStart <= SNAPSHOT_SLICE_MS)
      return
    await new Promise(resolve => setImmediate(resolve))
    sliceStart = performance.now()
  }
}

const SLICED_ARRAY_MIN_LENGTH = 1024

/**
 * Same output as `JSON.stringify(value)`, but large arrays are serialized item by item with
 * yields in between, so a cache of tens of megabytes doesn't block the event loop at once.
 */
export async function stringifyInSlices(value: unknown): Promise<string[]> {
  const parts: string[] = []
  const yieldIfBusy = createYielder()
  const visit = async (item: unknown, inArray: boolean): Promise<void> => {
    if (Array.isArray(item) && item.length >= SLICED_ARRAY_MIN_LENGTH) {
      parts.push('[')
      for (let index = 0; index < item.length; index++) {
        if (index)
          parts.push(',')
        await visit(item[index], true)
        await yieldIfBusy()
      }
      parts.push(']')
      return
    }
    if (item && typeof item === 'object' && !Array.isArray(item) && typeof (item as { toJSON?: unknown }).toJSON !== 'function') {
      parts.push('{')
      let first = true
      for (const [key, child] of Object.entries(item)) {
        if (child === undefined || typeof child === 'function' || typeof child === 'symbol')
          continue
        parts.push(`${first ? '' : ','}${JSON.stringify(key)}:`)
        first = false
        await visit(child, false)
      }
      parts.push('}')
      return
    }
    const json = JSON.stringify(item)
    parts.push(json ?? (inArray ? 'null' : ''))
  }
  await visit(value, false)
  return parts
}

function toLogStat(stat: Stats) {
  return { size: stat.size, mtime: stat.mtime.getTime() }
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

export class RolldownLogCache {
  private sessionSummaryCache: RolldownLogCacheFile<RolldownSessionSummaryCacheSnapshot> | undefined
  private moduleMetricsSummaryCache: RolldownLogCacheFile<RolldownModuleMetricsSummaryCacheSnapshot> | undefined
  private pluginSummaryCache: RolldownLogCacheFile<RolldownPluginSummaryCacheSnapshot> | undefined
  private readerIndexCache: RolldownReaderIndexCacheFile | undefined
  private packageSummaryCache: RolldownLogCacheFile<RolldownPackageSummaryCacheSnapshot> | undefined
  private completeSessionWriteAttempted = false
  private summaryWriteAttempted = false
  private packageSummaryWriteAttempted = false

  constructor(logFilepath: string, options: { completeSession: boolean }) {
    if (options.completeSession) {
      this.sessionSummaryCache = RolldownLogCacheFile.forLogFile(logFilepath, ROLLDOWN_LOG_SESSION_SUMMARY_CACHE_FILENAME)
      this.moduleMetricsSummaryCache = RolldownLogCacheFile.forLogFile(logFilepath, ROLLDOWN_LOG_MODULE_METRICS_SUMMARY_CACHE_FILENAME)
      this.pluginSummaryCache = RolldownLogCacheFile.forLogFile(logFilepath, ROLLDOWN_LOG_PLUGIN_SUMMARY_CACHE_FILENAME)
      this.readerIndexCache = RolldownReaderIndexCacheFile.forLogFile(logFilepath)
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

    if (sessionSummaryCache.reader.lastBytes !== stat.size || indexCache.lastBytes !== stat.size)
      return false

    this.restoreSessionSnapshot(sessionSummaryCache, state, moduleMetricsCache)
    state.moduleEventIndex = indexCache.moduleEventIndex
    state.stringRefIndex = indexCache.stringRefIndex
    state.pendingHookCallStarts = indexCache.pendingHookCallStarts
    state.assetsReadyLocations = indexCache.assetsReadyLocations
    this.completeSessionWriteAttempted = true
    this.summaryWriteAttempted = true
    return true
  }

  async restoreSummary(stat: Stats, state: RolldownLogCacheState) {
    if (state.lastBytes || state.manager.eventCount)
      return false

    // The module list needs the metrics; the index is loaded on a full read.
    const [sessionSummaryCache, moduleMetricsCache] = await Promise.all([
      this.sessionSummaryCache?.read(stat),
      this.moduleMetricsSummaryCache?.read(stat),
    ])
    if (!sessionSummaryCache || sessionSummaryCache.reader.lastBytes !== stat.size)
      return false

    this.restoreSessionSnapshot(sessionSummaryCache, state, moduleMetricsCache)
    this.clearReaderIndexState(state)
    this.summaryWriteAttempted = true
    return 'summary' as const
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

  async readPluginSummary(stat: Stats) {
    const cache = await this.pluginSummaryCache?.read(stat)
    return new Map(cache?.plugins ?? [])
  }

  async writeCompleteSession(stat: Stats, state: RolldownLogCacheState) {
    this.completeSessionWriteAttempted = true
    this.summaryWriteAttempted = true
    await this.writeSidecars(stat, state)
  }

  async writeSummary(stat: Stats, state: RolldownLogCacheState) {
    this.summaryWriteAttempted = true
    // Writes the same sidecars as a complete session, so don't write them again for the full read.
    this.completeSessionWriteAttempted = true
    await this.writeSidecars(stat, state)
  }

  private async writeSidecars(stat: Stats, state: RolldownLogCacheState) {
    // Large sessions have tens of thousands of modules, so build the snapshots in slices first.
    const manager = state.manager.snapshot()
    const sessionSummary = this.createSessionSummarySnapshot(state, manager)
    const moduleMetrics = await this.createModuleMetricsSummarySnapshot(manager)
    const pluginSummary = await this.createPluginSummarySnapshot(state)
    await Promise.all([
      this.sessionSummaryCache?.write(stat, sessionSummary),
      this.moduleMetricsSummaryCache?.write(stat, moduleMetrics),
      this.pluginSummaryCache?.write(stat, pluginSummary),
      this.readerIndexCache?.write(stat, state),
    ])
  }

  async writePackageSummary(stat: Stats, state: RolldownLogCacheState) {
    this.packageSummaryWriteAttempted = true
    await this.packageSummaryCache?.write(stat, this.createPackageSummarySnapshot(state))
  }

  private createSessionSummarySnapshot(state: RolldownLogCacheState, manager: ManagerSnapshot): RolldownSessionSummaryCacheSnapshot {
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
        packageGraphReady: manager.packageGraphReady,
        packages: manager.packages,
        build_start_time: manager.build_start_time,
        build_end_time: manager.build_end_time,
      },
    }
  }

  private async createModuleMetricsSummarySnapshot(manager: ManagerSnapshot): Promise<RolldownModuleMetricsSummaryCacheSnapshot> {
    const yieldIfBusy = createYielder()
    const metrics: RolldownModuleMetricsSummaryCacheSnapshot['metrics'] = []
    for (const [module, moduleMetrics] of manager.module_build_metrics) {
      metrics.push([module, compactModuleBuildMetrics(moduleMetrics)])
      await yieldIfBusy()
    }
    return { metrics }
  }

  private async createPluginSummarySnapshot(state: RolldownLogCacheState): Promise<RolldownPluginSummaryCacheSnapshot> {
    const yieldIfBusy = createYielder()
    const plugins: RolldownPluginSummaryCacheSnapshot['plugins'] = []
    for (const [pluginId, metrics] of state.manager.plugin_build_metrics) {
      // Summaries are accumulated while parsing; metrics hydrated from the index don't have one yet.
      plugins.push([pluginId, state.manager.plugin_build_summaries.get(pluginId) ?? createPluginBuildMetricsSummary(metrics)])
      await yieldIfBusy()
    }
    return { plugins }
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
      packageGraphReady: session.manager.packageGraphReady ?? !!session.manager.packages?.length,
      packages: session.manager.packages ?? [],
      source_refs: [],
      module_build_hook_events: [],
      module_build_metrics: moduleMetrics?.metrics ?? [],
      plugin_build_metrics: [],
      build_start_time: session.manager.build_start_time,
      build_end_time: session.manager.build_end_time,
    })
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
