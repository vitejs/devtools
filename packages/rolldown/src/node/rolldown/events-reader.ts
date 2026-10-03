import type { Event, HookLoadCallEnd, HookTransformCallEnd, HookTransformCallStart, SessionMeta } from '@rolldown/debug'
import type { ModuleBuildMetrics, PluginBuildMetrics, RolldownModuleLoadInfo, RolldownModuleTransformInfo, RolldownResolveInfo } from '../../shared/types'
import type { IndexedHookCall, LineLocation, ModuleEventIndex, PendingHookCallStart, PluginBuildMetricsSummary, RolldownLogCacheState } from './log-cache'
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { parseToEvent } from '@rolldown/debug'
import { diagnostics } from '../diagnostics'
import { getContentByteSize } from '../utils/format'
import { getContentRef, RolldownEventsManager } from './events-manager'
import { RolldownLogCache } from './log-cache'

const readers: Map<string, RolldownEventsReader> = new Map()
const MAX_READERS = 32
const MAX_MODULE_METRICS_CACHE = 32
const MAX_MODULE_METRICS_CACHE_BYTES = 64 * 1024 * 1024
const READ_STREAM_HIGH_WATER_MARK = 1024 * 1024
const LINE_FEED = '\n'.charCodeAt(0)
const CARRIAGE_RETURN = '\r'.charCodeAt(0)
const ACTION_PREVIEW_BYTES = 512
const PACKAGE_SUMMARY_MAX_PARSED_LINE_BYTES = 1024 * 1024
const PACKAGE_SUMMARY_ACTIONS = new Set([
  'ChunkGraphReady',
  'HookTransformCallEnd',
  'ModuleGraphReady',
  'PackageGraphReady',
  'StringRef',
])
const PACKAGE_SUMMARY_LARGE_LINE_ACTIONS = new Set([
  'HookTransformCallEnd',
  'StringRef',
])

interface DeferredContent {
  value: string | null
  ref: string | null
}

interface ModuleMetricsCacheEntry {
  metrics: ModuleBuildMetrics
  bytes: number
}

type ContentEvent = HookLoadCallEnd | HookTransformCallStart | HookTransformCallEnd
type IndexedEvent = Event & { event_id?: string }

interface ReadEventLinesOptions {
  onlyActions?: ReadonlySet<string>
  skipAction?: string
  maxLineBytes?: number
  largeLineActions?: ReadonlySet<string>
  onSkippedLine?: (line: SkippedEventLine) => void
}

interface SkippedEventLine {
  action: string | undefined
  location: LineLocation
  preview: Buffer
}

function getDeferredContent(event: ContentEvent, refs: Set<string>): DeferredContent {
  if (typeof event.content !== 'string') {
    return {
      value: null,
      ref: null,
    }
  }

  const ref = getContentRef(event.content)
  if (ref) {
    refs.add(ref)
    return {
      value: null,
      ref,
    }
  }

  return {
    value: event.content,
    ref: null,
  }
}

function resolveDeferredContent(content: DeferredContent, refs: Map<string, string>) {
  if (content.ref) {
    return refs.get(content.ref) ?? `$ref:${content.ref}`
  }
  return content.value
}

function cloneModuleBuildMetrics(metrics: ModuleBuildMetrics): ModuleBuildMetrics {
  return {
    resolve_ids: metrics.resolve_ids.map(item => ({ ...item })),
    loads: metrics.loads.map(item => ({ ...item })),
    transforms: metrics.transforms.map(item => ({ ...item })),
  }
}

function getContentCacheBytes(content: string | null | undefined) {
  return content ? getContentByteSize(content) : 0
}

function getContentHash(content: string | null | undefined) {
  return createHash('sha1').update(content ?? '').digest('hex')
}

function getModuleBuildMetricsCacheBytes(metrics: ModuleBuildMetrics) {
  return metrics.loads.reduce((total, load) => total + getContentCacheBytes(load.content), 0)
    + metrics.transforms.reduce((total, transform) => total
      + getContentCacheBytes(transform.content_from)
      + getContentCacheBytes(transform.content_to), 0)
}

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return !!value && typeof (value as Promise<T>).then === 'function'
}

function stripLineEnd(line: Buffer) {
  if (line.at(-1) === CARRIAGE_RETURN)
    return line.subarray(0, -1).toString('utf8')
  return line.toString('utf8')
}

function appendPreview(preview: Buffer, segment: Buffer) {
  if (preview.length >= ACTION_PREVIEW_BYTES || !segment.length)
    return preview

  const remaining = ACTION_PREVIEW_BYTES - preview.length
  const next = segment.subarray(0, Math.min(remaining, segment.length))
  return preview.length
    ? Buffer.concat([preview, next], preview.length + next.length)
    : Buffer.from(next)
}

function getPreviewAction(preview: Buffer) {
  const match = preview.toString('utf8').match(/"action":"([^"]+)"/)
  return match?.[1]
}

function getReferencedContentByteSize(content: unknown, refs: Map<string, number>) {
  if (typeof content !== 'string')
    return 0

  const ref = getContentRef(content)
  if (ref)
    return refs.get(ref) ?? 0

  return getContentByteSize(content)
}

function getPreviewStringValue(preview: Buffer, key: string) {
  const match = preview.toString('utf8').match(new RegExp(`"${key}":"((?:\\\\.|[^"])*)"`))
  if (!match)
    return undefined

  try {
    return JSON.parse(`"${match[1]}"`) as string
  }
  catch {
    return undefined
  }
}

function estimateContentByteSizeFromLine(preview: Buffer, location: LineLocation) {
  const marker = Buffer.from('"content":"')
  const index = preview.indexOf(marker)
  if (index === -1)
    return 0

  const contentStart = index + marker.length
  // The remaining JSON properties and closing quote are tiny compared to skipped content.
  return Math.max(0, location.length - contentStart - 128)
}

function summarizePluginCalls(calls: PluginBuildMetrics['calls']): Pick<PluginBuildMetricsSummary, 'total' | 'resolve' | 'load' | 'transform'> {
  const summary: Pick<PluginBuildMetricsSummary, 'total' | 'resolve' | 'load' | 'transform'> = {
    total: { count: 0, duration: 0 },
    resolve: { count: 0, duration: 0 },
    load: { count: 0, duration: 0 },
    transform: { count: 0, duration: 0 },
  }

  for (const call of calls) {
    const metric = summary[call.type]

    summary.total.count += 1
    summary.total.duration += call.duration
    metric.count += 1
    metric.duration += call.duration
  }

  return summary
}

function pruneReaders() {
  if (readers.size <= MAX_READERS)
    return

  for (const reader of Array.from(readers.values())) {
    if (readers.size <= MAX_READERS)
      return
    if (!reader.hasPendingRead()) {
      reader.dispose()
    }
  }
}

export class RolldownEventsReader {
  lastBytes: number = 0
  lastTimestamp: number = 0
  manager = new RolldownEventsManager()
  meta: SessionMeta | undefined
  private pendingRead: Promise<void> | undefined
  private pendingSummaryRead: Promise<void> | undefined
  private lineNumber: number = 0
  private moduleEventIndex: Map<string, ModuleEventIndex> = new Map()
  private stringRefIndex: Map<string, LineLocation> = new Map()
  private pendingHookCallStarts: Map<string, PendingHookCallStart> = new Map()
  private moduleMetricsCache: Map<string, ModuleMetricsCacheEntry> = new Map()
  private moduleMetricsCacheBytes: number = 0
  private pendingModuleMetrics: Map<string, Promise<ModuleBuildMetrics>> = new Map()
  private assetsReadyLocations: LineLocation[] = []
  private assetsHydrated = false
  private pendingPackageSummaryRead: Promise<void> | undefined
  private packageSummaryTimestamp: number = 0
  private summaryOnly = false
  private packageSummaryOnly = false
  private metricsSummaryOnly = false
  private logCache: RolldownLogCache

  private constructor(
    readonly filepath: string,
    private readonly cacheKey: string = filepath,
  ) {
    this.logCache = new RolldownLogCache(filepath, {
      completeSession: cacheKey === filepath,
    })
  }

  static get(filepath: string, cacheKey: string = filepath) {
    if (readers.has(cacheKey)) {
      const reader = readers.get(cacheKey)!
      readers.delete(cacheKey)
      readers.set(cacheKey, reader)
      return reader
    }
    const reader = new RolldownEventsReader(filepath, cacheKey)
    readers.set(cacheKey, reader)
    pruneReaders()
    return reader
  }

  static peek(filepath: string, cacheKey: string = filepath) {
    return readers.get(cacheKey)
  }

  async read() {
    if (this.pendingRead) {
      return this.pendingRead
    }

    if (this.pendingSummaryRead)
      await this.pendingSummaryRead

    this.pendingRead = this.readChanges().finally(() => {
      this.pendingRead = undefined
    })
    return this.pendingRead
  }

  async readSummary() {
    if (this.pendingRead)
      return this.pendingRead

    if (this.pendingSummaryRead)
      return this.pendingSummaryRead

    this.pendingSummaryRead = this.readSummaryChanges().finally(() => {
      this.pendingSummaryRead = undefined
    })
    return this.pendingSummaryRead
  }

  private async readChanges() {
    const stat = await fs.promises.stat(this.filepath)
    const mtime = stat.mtime.getTime()

    if (this.summaryOnly || this.packageSummaryOnly)
      this.resetReadState()

    if (await this.logCache.restoreCompleteSession(stat, this.createLogCacheState())) {
      this.clearModuleMetricsCache()
      this.pendingModuleMetrics.clear()
      this.summaryOnly = false
      this.packageSummaryOnly = false
      this.assetsHydrated = false
      return
    }

    if (mtime <= this.lastTimestamp) {
      if (this.hasCompleteSession() && this.logCache.shouldWriteCompleteSession())
        await this.logCache.writeCompleteSession(stat, this.createLogCacheState())
      return
    }

    let changed = false
    await this.readEventLines(this.lastBytes, (event, location) => {
      changed = true
      if (event.action === 'SessionMeta') {
        this.meta = event as SessionMeta
      }
      this.manager.handleEvent(event)
      this.indexEvent(event, location)
    }, {
      skipAction: 'AssetsReady',
      onSkippedLine: line => this.recordAssetsReadyLocation(line),
    })
    if (changed) {
      this.clearModuleMetricsCache()
      this.pendingModuleMetrics.clear()
      this.logCache.resetCompleteSessionWriteAttempt()
    }
    this.lastTimestamp = mtime
    this.lastBytes = stat.size
    this.metricsSummaryOnly = false

    await this.logCache.writeCompleteSession(stat, this.createLogCacheState())
  }

  private async readSummaryChanges() {
    const stat = await fs.promises.stat(this.filepath)
    const mtime = stat.mtime.getTime()

    if (this.manager.eventCount && mtime <= this.lastTimestamp) {
      if (this.logCache.shouldWriteSummary())
        await this.logCache.writeSummary(stat, this.createLogCacheState())
      return
    }

    const restoredSummary = await this.logCache.restoreSummary(stat, this.createLogCacheState())
    if (restoredSummary) {
      this.clearModuleMetricsCache()
      this.pendingModuleMetrics.clear()
      this.summaryOnly = restoredSummary !== 'complete'
      this.packageSummaryOnly = false
      this.assetsHydrated = false
      return
    }

    if (this.manager.eventCount || this.lastBytes)
      this.resetReadState()

    let changed = false
    await this.readEventLines(0, (event, location) => {
      changed = true
      if (event.action === 'SessionMeta') {
        this.meta = event as SessionMeta
      }
      this.manager.handleEvent(event)
      this.indexEvent(event, location)
    }, {
      skipAction: 'AssetsReady',
      onSkippedLine: line => this.recordAssetsReadyLocation(line),
    })
    if (changed) {
      this.clearModuleMetricsCache()
      this.pendingModuleMetrics.clear()
      this.logCache.resetSummaryWriteAttempt()
    }
    this.lastTimestamp = mtime
    this.lastBytes = stat.size
    this.summaryOnly = false
    this.packageSummaryOnly = false
    this.metricsSummaryOnly = false

    await this.logCache.writeSummary(stat, this.createLogCacheState())
  }

  private async readEventLines(
    start: number,
    processor: (event: Event, location: LineLocation) => void | Promise<void>,
    options: ReadEventLinesOptions = {},
  ) {
    const stream = fs.createReadStream(this.filepath, {
      start,
      highWaterMark: READ_STREAM_HIGH_WATER_MARK,
    })
    let absoluteOffset = start
    let lineStartOffset = start
    let parts: Buffer[] = []
    let partsLength = 0
    let preview: Buffer<ArrayBufferLike> = Buffer.alloc(0)
    let skipCurrentLine = false
    let lineAction: string | undefined

    const processLine = async (line: Buffer, location: LineLocation) => {
      this.lineNumber += 1
      const text = stripLineEnd(line)
      if (!text)
        return

      try {
        const event = parseToEvent(text)
        const result = processor(event, location)
        if (isPromiseLike(result))
          await result
      }
      catch (e) {
        const preview = text.length > 256 ? `${text.slice(0, 256)}...` : text
        diagnostics.RDDT0002({ line: this.lineNumber, error: (e as Error).message, preview })
      }
    }

    const appendSegmentPreview = (segment: Buffer) => {
      if (skipCurrentLine)
        return

      preview = appendPreview(preview, segment)
      lineAction = lineAction ?? getPreviewAction(preview)
      const lineBytes = partsLength + segment.length

      if (
        lineAction
        && (
          options.skipAction === lineAction
          || (options.onlyActions && !options.onlyActions.has(lineAction))
          || (
            options.maxLineBytes != null
            && lineBytes > options.maxLineBytes
            && !!options.largeLineActions?.has(lineAction)
          )
        )
      ) {
        skipCurrentLine = true
        parts = []
        partsLength = 0
      }
    }

    const processSkippedLine = (location: LineLocation) => {
      this.lineNumber += 1
      options.onSkippedLine?.({
        action: lineAction,
        location,
        preview,
      })
    }

    const resetLine = (nextLineStartOffset: number) => {
      parts = []
      partsLength = 0
      preview = Buffer.alloc(0)
      skipCurrentLine = false
      lineAction = undefined
      lineStartOffset = nextLineStartOffset
    }

    for await (const chunk of stream) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      let segmentStart = 0
      let newline = buffer.indexOf(LINE_FEED)

      while (newline !== -1) {
        const segment = buffer.subarray(segmentStart, newline)
        if (!partsLength && !preview.length)
          lineStartOffset = absoluteOffset + segmentStart

        appendSegmentPreview(segment)
        const location = {
          offset: lineStartOffset,
          length: absoluteOffset + newline + 1 - lineStartOffset,
        }

        if (skipCurrentLine) {
          processSkippedLine(location)
        }
        else {
          let line = segment
          if (partsLength) {
            parts.push(segment)
            line = Buffer.concat(parts, partsLength + segment.length)
          }
          await processLine(line, location)
        }

        segmentStart = newline + 1
        resetLine(absoluteOffset + segmentStart)
        newline = buffer.indexOf(LINE_FEED, segmentStart)
      }

      if (segmentStart < buffer.length) {
        if (!partsLength && !preview.length)
          lineStartOffset = absoluteOffset + segmentStart
        const tail = buffer.subarray(segmentStart)
        appendSegmentPreview(tail)
        if (!skipCurrentLine) {
          parts.push(tail)
          partsLength += tail.length
        }
      }

      absoluteOffset += buffer.length
    }

    if (skipCurrentLine) {
      processSkippedLine({
        offset: lineStartOffset,
        length: absoluteOffset - lineStartOffset,
      })
    }
    else if (partsLength) {
      await processLine(Buffer.concat(parts, partsLength), {
        offset: lineStartOffset,
        length: partsLength,
      })
    }
  }

  async readAssets() {
    await this.read()

    if (this.assetsHydrated)
      return

    this.manager.assets.clear()
    this.manager.chunkAssetMap.clear()

    const events = await this.readEventsAt(this.assetsReadyLocations)
    for (const event of events) {
      if (event?.action === 'AssetsReady') {
        this.manager.handleEvent(event)
      }
    }
    this.assetsHydrated = true
  }

  private recordAssetsReadyLocation(line: SkippedEventLine) {
    if (line.action !== 'AssetsReady')
      return

    this.assetsReadyLocations.push(line.location)
    this.assetsHydrated = false
  }

  async readPackageSummary() {
    if (this.pendingPackageSummaryRead)
      return this.pendingPackageSummaryRead

    this.pendingPackageSummaryRead = this.readPackageSummaryChanges().finally(() => {
      this.pendingPackageSummaryRead = undefined
    })
    return this.pendingPackageSummaryRead
  }

  async readPluginBuildMetricsSummary(): Promise<Map<number, PluginBuildMetricsSummary>> {
    await this.read()

    const stat = await fs.promises.stat(this.filepath)
    const cachedSummary = await this.logCache.readPluginSummary(stat)
    if (cachedSummary.size)
      return cachedSummary

    return new Map(
      Array.from(this.manager.plugin_build_metrics.values()).map((metrics) => {
        const summary: PluginBuildMetricsSummary = {
          plugin_id: metrics.plugin_id,
          plugin_name: metrics.plugin_name,
          ...summarizePluginCalls(metrics.calls),
        }

        return [metrics.plugin_id, summary] as const
      }),
    )
  }

  async ensurePackageSummaryCache() {
    const stat = await fs.promises.stat(this.filepath)
    this.packageSummaryTimestamp = stat.mtime.getTime()
    if (this.logCache.shouldWritePackageSummary())
      await this.logCache.writePackageSummary(stat, this.createLogCacheState())
  }

  private async readPackageSummaryChanges() {
    const stat = await fs.promises.stat(this.filepath)
    const mtime = stat.mtime.getTime()
    if (mtime <= this.packageSummaryTimestamp) {
      if (this.packageSummaryOnly && this.logCache.shouldWritePackageSummary())
        await this.logCache.writePackageSummary(stat, this.createLogCacheState())
      return
    }

    if (await this.logCache.restorePackageSummary(stat, this.createLogCacheState())) {
      this.clearModuleMetricsCache()
      this.pendingModuleMetrics.clear()
      this.packageSummaryOnly = true
      this.summaryOnly = false
      return
    }

    this.disposeData()

    const sourceRefSizes = new Map<string, number>()
    await this.readEventLines(0, (event) => {
      if (event.action === 'StringRef') {
        sourceRefSizes.set(event.id, getContentByteSize(event.content))
        return
      }

      if (event.action === 'HookTransformCallEnd') {
        this.recordPackageTransformEnd(event, sourceRefSizes)
        return
      }

      if (
        event.action === 'ChunkGraphReady'
        || event.action === 'ModuleGraphReady'
        || event.action === 'PackageGraphReady'
      ) {
        this.manager.handleEvent(event)
      }
    }, {
      onlyActions: PACKAGE_SUMMARY_ACTIONS,
      maxLineBytes: PACKAGE_SUMMARY_MAX_PARSED_LINE_BYTES,
      largeLineActions: PACKAGE_SUMMARY_LARGE_LINE_ACTIONS,
      onSkippedLine: line => this.recordPackageSummarySkippedLine(line, sourceRefSizes),
    })

    for (const [id, metrics] of this.manager.module_build_metrics) {
      const module = this.manager.modules.get(id)
      if (module)
        module.build_metrics = metrics
    }

    this.packageSummaryTimestamp = mtime
    this.packageSummaryOnly = true
    this.summaryOnly = false
    this.logCache.resetPackageSummaryWriteAttempt()

    await this.logCache.writePackageSummary(stat, this.createLogCacheState())
  }

  private recordPackageSummarySkippedLine(line: SkippedEventLine, sourceRefSizes: Map<string, number>) {
    if (line.action === 'StringRef') {
      const id = getPreviewStringValue(line.preview, 'id')
      if (id)
        sourceRefSizes.set(id, estimateContentByteSizeFromLine(line.preview, line.location))
      return
    }

    if (line.action === 'HookTransformCallEnd') {
      const moduleId = getPreviewStringValue(line.preview, 'module_id')
      if (moduleId)
        this.recordPackageTransformSize(moduleId, estimateContentByteSizeFromLine(line.preview, line.location))
    }
  }

  private recordPackageTransformEnd(event: HookTransformCallEnd & { timestamp?: string | number }, refs: Map<string, number>) {
    if (!event.module_id)
      return

    this.recordPackageTransformSize(
      event.module_id,
      getReferencedContentByteSize(event.content, refs),
      event,
    )
  }

  private recordPackageTransformSize(
    moduleId: string,
    transformedCodeSize: number,
    event?: HookTransformCallEnd & { timestamp?: string | number },
  ) {
    const moduleBuildMetrics = this.manager.module_build_metrics.get(moduleId) ?? {
      resolve_ids: [],
      loads: [],
      transforms: [],
    }

    moduleBuildMetrics.transforms.push({
      type: 'transform',
      id: '',
      plugin_name: event?.plugin_name ?? '',
      plugin_id: event?.plugin_id ?? 0,
      content_from: null,
      content_to: null,
      source_code_size: 0,
      transformed_code_size: transformedCodeSize,
      timestamp_start: +(event?.timestamp ?? 0),
      timestamp_end: +(event?.timestamp ?? 0),
      duration: 0,
    })
    this.manager.module_build_metrics.set(moduleId, moduleBuildMetrics)
  }

  private getModuleEventIndex(module: string) {
    let index = this.moduleEventIndex.get(module)
    if (!index) {
      index = {
        resolveIds: new Map(),
        loads: new Map(),
        transforms: new Map(),
      }
      this.moduleEventIndex.set(module, index)
    }
    return index
  }

  private indexEvent(event: IndexedEvent, location: LineLocation) {
    if (event.action === 'StringRef') {
      this.stringRefIndex.set(event.id, location)
      return
    }

    if (event.action === 'HookResolveIdCallStart' && event.call_id) {
      this.pendingHookCallStarts.set(event.call_id, {
        location,
      })
      return
    }

    if (event.action === 'HookResolveIdCallEnd' && event.call_id) {
      const start = this.pendingHookCallStarts.get(event.call_id)
      this.pendingHookCallStarts.delete(event.call_id)
      if (!start || !event.event_id || !event.resolved_id)
        return

      this.getModuleEventIndex(event.resolved_id).resolveIds.set(event.event_id, {
        start: start.location,
        end: location,
      })
      return
    }

    if (event.action === 'HookLoadCallStart' && event.call_id && event.module_id) {
      this.pendingHookCallStarts.set(event.call_id, {
        module: event.module_id,
        location,
      })
      return
    }

    if (event.action === 'HookLoadCallEnd' && event.module_id && event.event_id) {
      const start = event.call_id
        ? this.pendingHookCallStarts.get(event.call_id)
        : undefined
      if (event.call_id)
        this.pendingHookCallStarts.delete(event.call_id)

      if (!start)
        return

      this.getModuleEventIndex(event.module_id).loads.set(event.event_id, {
        start: start.location,
        end: location,
      })
      return
    }

    if (event.action === 'HookTransformCallStart' && event.call_id && event.module_id) {
      this.pendingHookCallStarts.set(event.call_id, {
        module: event.module_id,
        location,
      })
      return
    }

    if (event.action === 'HookTransformCallEnd' && event.call_id) {
      const start = this.pendingHookCallStarts.get(event.call_id)
      this.pendingHookCallStarts.delete(event.call_id)
      if (!start)
        return

      if (!event.event_id)
        return

      this.getModuleEventIndex(event.module_id ?? start.module).transforms.set(event.event_id, {
        start: start.location,
        end: location,
      })
      return
    }

    if (event.action === 'ModuleGraphReady') {
      this.pendingHookCallStarts.clear()
    }
  }

  private async readEventsAt(locations: LineLocation[]): Promise<Array<Event | undefined>> {
    if (!locations.length)
      return []

    const file = await fs.promises.open(this.filepath, 'r')
    try {
      const events: Array<Event | undefined> = []
      for (const location of locations) {
        const buffer = Buffer.allocUnsafe(location.length)
        const { bytesRead } = await file.read(buffer, 0, location.length, location.offset)
        let end = bytesRead
        if (end > 0 && buffer[end - 1] === LINE_FEED)
          end -= 1
        if (end > 0 && buffer[end - 1] === CARRIAGE_RETURN)
          end -= 1

        const text = buffer.subarray(0, end).toString('utf8')
        if (!text) {
          events.push(undefined)
          continue
        }
        try {
          events.push(parseToEvent(text))
        }
        catch {
          events.push(undefined)
        }
      }
      return events
    }
    finally {
      await file.close()
    }
  }

  private async readStringRefs(refs: Set<string>) {
    const values = new Map<string, string>()
    if (!refs.size)
      return values

    const ids: string[] = []
    const locations: LineLocation[] = []
    for (const id of refs) {
      const location = this.stringRefIndex.get(id)
      if (!location)
        continue
      ids.push(id)
      locations.push(location)
    }

    const events = await this.readEventsAt(locations)
    for (const [index, event] of events.entries()) {
      if (event?.action === 'StringRef')
        values.set(ids[index]!, event.content)
    }

    return values
  }

  async readModuleBuildMetrics(module: string): Promise<ModuleBuildMetrics> {
    await this.read()

    const cached = this.moduleMetricsCache.get(module)
    if (cached) {
      this.moduleMetricsCache.delete(module)
      this.moduleMetricsCache.set(module, cached)
      return cloneModuleBuildMetrics(cached.metrics)
    }

    if (this.metricsSummaryOnly) {
      const metrics = await this.hydrateModuleBuildMetricsFromIndex(module)
      if (metrics) {
        this.setCachedModuleBuildMetrics(module, metrics)
        return cloneModuleBuildMetrics(metrics)
      }
    }

    const pending = this.pendingModuleMetrics.get(module)
    if (pending)
      return cloneModuleBuildMetrics(await pending)

    const promise = this.hydrateModuleBuildMetrics(module)
    this.pendingModuleMetrics.set(module, promise)
    try {
      const metrics = await promise
      this.setCachedModuleBuildMetrics(module, metrics)
      return cloneModuleBuildMetrics(metrics)
    }
    finally {
      this.pendingModuleMetrics.delete(module)
    }
  }

  async hydratePluginBuildMetrics(pluginId: number) {
    await this.read()

    let metrics = this.manager.plugin_build_metrics.get(pluginId)
    if (!metrics && this.metricsSummaryOnly) {
      metrics = await this.hydratePluginBuildMetricsFromIndex(pluginId)
      if (metrics)
        this.manager.plugin_build_metrics.set(pluginId, metrics)
    }

    if (!metrics)
      return

    const transformCalls = metrics.calls.filter(call => call.type === 'transform' && call.unchanged == null)
    if (!transformCalls.length)
      return

    const refs = new Set<string>()
    const transformEventIndexes: Array<number | undefined> = []
    const locations: LineLocation[] = []

    for (const call of transformCalls) {
      const location = this.moduleEventIndex.get(call.module)?.transforms.get(call.id)
      if (!location) {
        transformEventIndexes.push(undefined)
        continue
      }
      transformEventIndexes.push(locations.length)
      locations.push(location.start, location.end)
    }

    const events = await this.readEventsAt(locations)
    const contents = transformCalls.map((call, index) => {
      const eventIndex = transformEventIndexes[index]
      if (eventIndex == null) {
        return {
          call,
          content_from: undefined,
          content_to: undefined,
        }
      }
      const start = events[eventIndex]
      const end = events[eventIndex + 1]
      return {
        call,
        content_from: start?.action === 'HookTransformCallStart'
          ? getDeferredContent(start, refs)
          : { value: null, ref: null },
        content_to: end?.action === 'HookTransformCallEnd'
          ? getDeferredContent(end, refs)
          : { value: null, ref: null },
      }
    })

    const refValues = await this.readStringRefs(refs)
    for (const item of contents) {
      if (!item.content_from || !item.content_to) {
        item.call.unchanged = false
        continue
      }
      const contentFrom = resolveDeferredContent(item.content_from, refValues)
      const contentTo = resolveDeferredContent(item.content_to, refValues)
      item.call.unchanged = getContentHash(contentFrom) === getContentHash(contentTo)
    }
  }

  private clearModuleMetricsCache() {
    this.moduleMetricsCache.clear()
    this.moduleMetricsCacheBytes = 0
  }

  private setCachedModuleBuildMetrics(module: string, metrics: ModuleBuildMetrics) {
    const bytes = getModuleBuildMetricsCacheBytes(metrics)
    const previous = this.moduleMetricsCache.get(module)
    if (previous) {
      this.moduleMetricsCacheBytes -= previous.bytes
      this.moduleMetricsCache.delete(module)
    }

    if (bytes > MAX_MODULE_METRICS_CACHE_BYTES)
      return

    this.moduleMetricsCache.set(module, {
      metrics,
      bytes,
    })
    this.moduleMetricsCacheBytes += bytes

    while (this.moduleMetricsCache.size > MAX_MODULE_METRICS_CACHE || this.moduleMetricsCacheBytes > MAX_MODULE_METRICS_CACHE_BYTES) {
      const firstKey = this.moduleMetricsCache.keys().next().value
      if (firstKey == null)
        break
      const deleted = this.moduleMetricsCache.get(firstKey)
      this.moduleMetricsCache.delete(firstKey)
      if (deleted)
        this.moduleMetricsCacheBytes -= deleted.bytes
    }
  }

  private async readIndexedHookEvents(calls: Array<[string, IndexedHookCall]>) {
    const locations = calls.flatMap(([, call]) => [call.start, call.end])
    const events = await this.readEventsAt(locations)
    return calls.map(([id], index) => ({
      id,
      start: events[index * 2],
      end: events[index * 2 + 1],
    }))
  }

  private async hydrateModuleBuildMetricsFromIndex(module: string): Promise<ModuleBuildMetrics | undefined> {
    const index = this.moduleEventIndex.get(module)
    if (!index)
      return undefined

    const [resolveEvents, loadEvents, transformEvents] = await Promise.all([
      this.readIndexedHookEvents(Array.from(index.resolveIds.entries())),
      this.readIndexedHookEvents(Array.from(index.loads.entries())),
      this.readIndexedHookEvents(Array.from(index.transforms.entries())),
    ])

    const refs = new Set<string>()
    const resolve_ids: RolldownResolveInfo[] = []
    for (const item of resolveEvents) {
      const start = item.start
      const end = item.end
      if (start?.action !== 'HookResolveIdCallStart' || end?.action !== 'HookResolveIdCallEnd')
        continue

      resolve_ids.push({
        type: 'resolve',
        id: item.id,
        plugin_name: end.plugin_name,
        plugin_id: end.plugin_id,
        importer: start.importer,
        module_request: start.module_request,
        import_kind: start.import_kind,
        resolved_id: end.resolved_id,
        timestamp_start: +start.timestamp,
        timestamp_end: +end.timestamp,
        duration: +end.timestamp - +start.timestamp,
      })
    }

    const loads: Array<Omit<RolldownModuleLoadInfo, 'content'> & { content: DeferredContent }> = []
    for (const item of loadEvents) {
      const start = item.start
      const end = item.end
      if (start?.action !== 'HookLoadCallStart' || end?.action !== 'HookLoadCallEnd')
        continue

      loads.push({
        type: 'load',
        id: item.id,
        plugin_name: end.plugin_name,
        plugin_id: end.plugin_id,
        content: getDeferredContent(end, refs),
        timestamp_start: +start.timestamp,
        timestamp_end: +end.timestamp,
        duration: +end.timestamp - +start.timestamp,
      })
    }

    const transforms: Array<Omit<RolldownModuleTransformInfo, 'content_from' | 'content_to' | 'diff_added' | 'diff_removed'> & {
      content_from: DeferredContent
      content_to: DeferredContent
      source_code_size: number
      transformed_code_size: number
    }> = []
    for (const item of transformEvents) {
      const start = item.start
      const end = item.end
      if (start?.action !== 'HookTransformCallStart' || end?.action !== 'HookTransformCallEnd')
        continue

      transforms.push({
        type: 'transform',
        id: item.id,
        plugin_name: end.plugin_name,
        plugin_id: end.plugin_id,
        content_from: getDeferredContent(start, refs),
        content_to: getDeferredContent(end, refs),
        timestamp_start: +start.timestamp,
        timestamp_end: +end.timestamp,
        duration: +end.timestamp - +start.timestamp,
        source_code_size: 0,
        transformed_code_size: 0,
      })
    }

    const refValues = await this.readStringRefs(refs)

    return {
      resolve_ids,
      loads: loads.map(load => ({
        ...load,
        content: resolveDeferredContent(load.content, refValues),
      })),
      transforms: transforms.map((transform) => {
        const content_from = resolveDeferredContent(transform.content_from, refValues)
        const content_to = resolveDeferredContent(transform.content_to, refValues)
        return {
          ...transform,
          content_from,
          content_to,
          source_code_size: getContentByteSize(content_from ?? ''),
          transformed_code_size: getContentByteSize(content_to ?? ''),
        }
      }),
    }
  }

  private async hydratePluginBuildMetricsFromIndex(pluginId: number): Promise<PluginBuildMetrics | undefined> {
    const calls: Array<{
      module: string
      type: 'resolve' | 'load' | 'transform'
      id: string
      location: IndexedHookCall
    }> = []

    for (const [module, index] of this.moduleEventIndex) {
      for (const [id, location] of index.resolveIds)
        calls.push({ module, type: 'resolve', id, location })
      for (const [id, location] of index.loads)
        calls.push({ module, type: 'load', id, location })
      for (const [id, location] of index.transforms)
        calls.push({ module, type: 'transform', id, location })
    }

    const events = await this.readIndexedHookEvents(calls.map(call => [call.id, call.location]))
    const metrics: PluginBuildMetrics = {
      plugin_id: pluginId,
      plugin_name: '',
      calls: [],
    }

    for (const [index, item] of events.entries()) {
      const call = calls[index]!
      const start = item.start
      const end = item.end
      if (!start || !end || !('plugin_id' in end) || end.plugin_id !== pluginId)
        continue

      const timestamp_start = 'timestamp' in start ? +start.timestamp : 0
      const timestamp_end = 'timestamp' in end ? +end.timestamp : 0
      metrics.plugin_name = end.plugin_name
      metrics.calls.push({
        type: call.type,
        id: call.id,
        duration: timestamp_end - timestamp_start,
        plugin_id: pluginId,
        plugin_name: end.plugin_name,
        module: call.type === 'resolve' && start.action === 'HookResolveIdCallStart'
          ? start.module_request
          : call.module,
        timestamp_start,
        timestamp_end,
        unchanged: call.type === 'load' && end.action === 'HookLoadCallEnd'
          ? !end.content
          : undefined,
      })
    }

    metrics.calls.sort((a, b) => a.timestamp_start - b.timestamp_start)
    return metrics.calls.length ? metrics : undefined
  }

  private async hydrateModuleBuildMetrics(module: string): Promise<ModuleBuildMetrics> {
    const summary = this.manager.module_build_metrics.get(module) ?? {
      resolve_ids: [],
      loads: [],
      transforms: [],
    }
    const index = this.moduleEventIndex.get(module)
    const refs = new Set<string>()
    const loadEventIndexes: Array<number | undefined> = []
    const loadLocations: LineLocation[] = []
    for (const load of summary.loads) {
      const location = index?.loads.get(load.id)?.end
      if (!location) {
        loadEventIndexes.push(undefined)
        continue
      }
      loadEventIndexes.push(loadLocations.length)
      loadLocations.push(location)
    }

    const transformEventIndexes: Array<number | undefined> = []
    const transformLocations: LineLocation[] = []
    for (const transform of summary.transforms) {
      const location = index?.transforms.get(transform.id)
      if (!location) {
        transformEventIndexes.push(undefined)
        continue
      }
      transformEventIndexes.push(transformLocations.length)
      transformLocations.push(location.start, location.end)
    }

    const loadEvents = await this.readEventsAt(loadLocations)
    const transformEvents = await this.readEventsAt(transformLocations)

    const loads: Array<Omit<RolldownModuleLoadInfo, 'content'> & { content: DeferredContent }> = summary.loads.map((load, index) => {
      const eventIndex = loadEventIndexes[index]
      const event = eventIndex == null
        ? undefined
        : loadEvents[eventIndex]
      return {
        ...load,
        content: event?.action === 'HookLoadCallEnd'
          ? getDeferredContent(event, refs)
          : {
              value: load.content,
              ref: null,
            },
      }
    })

    const transforms: Array<Omit<RolldownModuleTransformInfo, 'content_from' | 'content_to' | 'diff_added' | 'diff_removed'> & {
      content_from: DeferredContent
      content_to: DeferredContent
      source_code_size: number
      transformed_code_size: number
    }> = summary.transforms.map((transform, index) => {
      const eventIndex = transformEventIndexes[index]
      const start = eventIndex == null
        ? undefined
        : transformEvents[eventIndex]
      const end = eventIndex == null
        ? undefined
        : transformEvents[eventIndex + 1]
      return {
        ...transform,
        content_from: start?.action === 'HookTransformCallStart'
          ? getDeferredContent(start, refs)
          : {
              value: transform.content_from,
              ref: null,
            },
        content_to: end?.action === 'HookTransformCallEnd'
          ? getDeferredContent(end, refs)
          : {
              value: transform.content_to,
              ref: null,
            },
      }
    })

    const refValues = await this.readStringRefs(refs)

    return {
      resolve_ids: summary.resolve_ids.map(resolve => ({ ...resolve })),
      loads: loads.map(load => ({
        ...load,
        content: resolveDeferredContent(load.content, refValues),
      })),
      transforms: transforms.map((transform) => {
        const content_from = resolveDeferredContent(transform.content_from, refValues)
        const content_to = resolveDeferredContent(transform.content_to, refValues)
        return {
          ...transform,
          content_from,
          content_to,
          source_code_size: getContentByteSize(content_from ?? ''),
          transformed_code_size: getContentByteSize(content_to ?? ''),
        }
      }),
    }
  }

  hasPendingRead() {
    return !!this.pendingRead || !!this.pendingSummaryRead || !!this.pendingPackageSummaryRead
  }

  hasReadData() {
    return this.lastBytes > 0 || this.manager.eventCount > 0
  }

  private createLogCacheState(): RolldownLogCacheState {
    return Object.defineProperties({} as RolldownLogCacheState, {
      lastBytes: {
        get: () => this.lastBytes,
        set: (value: number) => {
          this.lastBytes = value
        },
      },
      lastTimestamp: {
        get: () => this.lastTimestamp,
        set: (value: number) => {
          this.lastTimestamp = value
        },
      },
      lineNumber: {
        get: () => this.lineNumber,
        set: (value: number) => {
          this.lineNumber = value
        },
      },
      moduleEventIndex: {
        get: () => this.moduleEventIndex,
        set: (value: Map<string, ModuleEventIndex>) => {
          this.moduleEventIndex = value
        },
      },
      stringRefIndex: {
        get: () => this.stringRefIndex,
        set: (value: Map<string, LineLocation>) => {
          this.stringRefIndex = value
        },
      },
      pendingHookCallStarts: {
        get: () => this.pendingHookCallStarts,
        set: (value: Map<string, PendingHookCallStart>) => {
          this.pendingHookCallStarts = value
        },
      },
      assetsReadyLocations: {
        get: () => this.assetsReadyLocations,
        set: (value: LineLocation[]) => {
          this.assetsReadyLocations = value
        },
      },
      meta: {
        get: () => this.meta,
        set: (value: SessionMeta | undefined) => {
          this.meta = value
        },
      },
      manager: {
        get: () => this.manager,
      },
      packageSummaryTimestamp: {
        get: () => this.packageSummaryTimestamp,
        set: (value: number) => {
          this.packageSummaryTimestamp = value
        },
      },
      metricsSummaryOnly: {
        get: () => this.metricsSummaryOnly,
        set: (value: boolean) => {
          this.metricsSummaryOnly = value
        },
      },
    })
  }

  hasCompleteSession() {
    return this.hasReadData() && !this.summaryOnly && !this.packageSummaryOnly
  }

  isReadingCompleteSession() {
    return !!this.pendingRead
  }

  dispose() {
    readers.delete(this.cacheKey)
    this.disposeData()
  }

  private resetReadState() {
    this.lastBytes = 0
    this.lastTimestamp = 0
    this.disposeData()
  }

  private disposeData() {
    this.manager.dispose()
    this.lineNumber = 0
    this.moduleEventIndex.clear()
    this.stringRefIndex.clear()
    this.pendingHookCallStarts.clear()
    this.clearModuleMetricsCache()
    this.pendingModuleMetrics.clear()
    this.assetsReadyLocations = []
    this.assetsHydrated = false
    this.summaryOnly = false
    this.packageSummaryOnly = false
    this.metricsSummaryOnly = false
    this.logCache.resetCompleteSessionWriteAttempt()
    this.logCache.resetPackageSummaryWriteAttempt()
  }

  [Symbol.dispose]() {
    this.dispose()
  }
}
