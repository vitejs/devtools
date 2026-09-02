import type {
  ViteInspectPluginCallInfo,
  ViteInspectResolveIdInfo,
  ViteInspectTransformInfo,
} from '../types'
import type { InspectPayloadStore } from './payload'
import type {
  InspectPluginCallStore,
  InspectPluginCallWrite,
} from './plugin-calls'
import type {
  PendingWrite,
  QueuedWrite,
  StoredViteInspectTransformInfo,
  ViteInspectPayloadRange,
  ViteInspectPluginMetricItem,
  ViteInspectResolveIdItem,
  ViteInspectStore,
  ViteInspectStoreOptions,
  ViteInspectStoreStats,
  ViteInspectTransformListItem,
} from './types'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { diagnostics } from '../../diagnostics'
import { DUMMY_LOAD_PLUGIN_NAME } from '../utils'
import { createInspectPayloadStore } from './payload'
import { createInspectPluginCallStore } from './plugin-calls'

const DEFAULT_MAX_BATCH_ITEMS = 256
const DEFAULT_MAX_BATCH_BYTES = 8 * 1024 * 1024

interface StoredModuleTransforms {
  publicModuleId: string
  invokeCount: number
  items: StoredViteInspectTransformInfo[]
}

interface ScopeData {
  transforms: Map<string, StoredModuleTransforms>
  resolveIds: Map<string, ViteInspectResolveIdItem[]>
}

interface PreparedWrite {
  write: Exclude<QueuedWrite, { operation: 'invalidate' | 'clearScope' }>
  resultIndex?: number
  sourceIndex?: number
  sourcemapIndex?: number
}

export type {
  ViteInspectPluginMetricItem,
  ViteInspectResolveIdItem,
  ViteInspectStore,
  ViteInspectStoreOptions,
  ViteInspectStoreStats,
  ViteInspectTransformListItem,
} from './types'

export async function createViteInspectStore(options: ViteInspectStoreOptions = {}): Promise<ViteInspectStore> {
  const filename = options.filename === ':memory:' ? undefined : options.filename
  if (filename)
    mkdirSync(dirname(filename), { recursive: true })

  let payloads: InspectPayloadStore | undefined
  try {
    payloads = await createInspectPayloadStore(filename)
    const pluginCalls = await createInspectPluginCallStore(
      filename ? join(dirname(filename), 'plugin-calls.bin') : undefined,
    )
    return new PayloadViteInspectStore(payloads, pluginCalls, options)
  }
  catch (error) {
    await payloads?.close().catch(() => {})
    reportStorageError('opening the inspect archives', error)
    throw error
  }
}

class PayloadViteInspectStore implements ViteInspectStore {
  private readonly maxBatchItems: number
  private readonly maxBatchBytes: number
  private readonly payloads: InspectPayloadStore
  private readonly pluginCalls: InspectPluginCallStore
  private readonly scopes = new Map<string, ScopeData>()

  private queue: Array<PendingWrite | undefined> = []
  private queueHead = 0
  private scheduledPump?: NodeJS.Immediate
  private pumpPromise?: Promise<void>
  private lastWriteError?: Error
  private closing = false
  private closed = false
  private closePromise?: Promise<void>

  private queuedItems = 0
  private queuedBytes = 0
  private inFlightItems = 0
  private peakQueuedItems = 0
  private peakQueuedBytes = 0
  private writeBatches = 0

  private activeReaders = 0
  private readerWaiters: Array<() => void> = []

  constructor(
    payloads: InspectPayloadStore,
    pluginCalls: InspectPluginCallStore,
    options: ViteInspectStoreOptions,
  ) {
    this.payloads = payloads
    this.pluginCalls = pluginCalls
    this.maxBatchItems = positiveInteger(options.maxBatchItems, DEFAULT_MAX_BATCH_ITEMS)
    this.maxBatchBytes = positiveInteger(options.maxBatchBytes, DEFAULT_MAX_BATCH_BYTES)
  }

  recordTransform(
    scope: string,
    moduleId: string,
    publicModuleId: string,
    info: ViteInspectTransformInfo,
    preTransformCode: string,
    pluginCall?: ViteInspectPluginCallInfo,
  ): void {
    this.enqueue({
      operation: 'recordTransform',
      scope,
      moduleId,
      publicModuleId,
      info,
      preTransformCode,
      pluginCall,
    })
  }

  recordLoad(
    scope: string,
    moduleId: string,
    publicModuleId: string,
    info: ViteInspectTransformInfo,
    pluginCall?: ViteInspectPluginCallInfo,
  ): void {
    this.enqueue({
      operation: 'recordLoad',
      scope,
      moduleId,
      publicModuleId,
      info,
      pluginCall,
    })
  }

  recordResolveId(
    scope: string,
    sourceId: string,
    sourcePublicId: string,
    info: ViteInspectResolveIdInfo,
    resultPublicId: string,
    pluginCall?: ViteInspectPluginCallInfo,
  ): void {
    this.enqueue({
      operation: 'recordResolveId',
      scope,
      sourceId,
      sourcePublicId,
      info,
      resultPublicId,
      pluginCall,
    })
  }

  recordPluginCall(scope: string, info: ViteInspectPluginCallInfo): void {
    this.enqueue({
      operation: 'recordPluginCall',
      scope,
      info,
    })
  }

  invalidate(scope: string, moduleId: string, publicModuleId: string): void {
    this.enqueue({
      operation: 'invalidate',
      scope,
      moduleId,
      publicModuleId,
    })
  }

  clearScope(scope: string): void {
    this.enqueue({
      operation: 'clearScope',
      scope,
    })
  }

  async getTransformList(scope: string): Promise<ViteInspectTransformListItem[]> {
    await this.flush()
    const result: ViteInspectTransformListItem[] = []
    for (const [moduleId, transforms] of this.scopes.get(scope)?.transforms ?? []) {
      for (const transform of transforms.items) {
        result.push({
          moduleId,
          publicModuleId: transforms.publicModuleId,
          name: transform.name,
          pluginId: transform.pluginId,
          hasResult: transform.hasResult,
          resultSize: transform.resultSize,
          start: transform.start,
          end: transform.end,
          invokeCount: transforms.invokeCount,
        })
      }
    }
    return result
  }

  async getResolveIdList(scope: string): Promise<ViteInspectResolveIdItem[]> {
    await this.flush()
    return Array.from(this.scopes.get(scope)?.resolveIds.values() ?? []).flat()
  }

  async getPluginTransformMetrics(scope: string): Promise<ViteInspectPluginMetricItem[]> {
    await this.flush()
    const metrics = new Map<string, ViteInspectPluginMetricItem>()
    for (const transforms of this.scopes.get(scope)?.transforms.values() ?? []) {
      for (const transform of transforms.items) {
        if (transform.name === DUMMY_LOAD_PLUGIN_NAME)
          continue
        addMetric(metrics, transform.pluginId, transform.name, transform.end - transform.start)
      }
    }
    return Array.from(metrics.values())
  }

  async getPluginResolveIdMetrics(scope: string): Promise<ViteInspectPluginMetricItem[]> {
    await this.flush()
    const metrics = new Map<string, ViteInspectPluginMetricItem>()
    for (const resolveIds of this.scopes.get(scope)?.resolveIds.values() ?? []) {
      for (const resolveId of resolveIds)
        addMetric(metrics, resolveId.pluginId, resolveId.name, resolveId.end - resolveId.start)
    }
    return Array.from(metrics.values())
  }

  async getModuleTransforms(scope: string, moduleId: string): Promise<ViteInspectTransformInfo[]> {
    return this.readSnapshot(async () => {
      const transforms = this.scopes.get(scope)?.transforms.get(moduleId)?.items ?? []
      return Promise.all(transforms.map(transform => this.restoreTransformInfo(transform)))
    })
  }

  async getPluginCalls(scope: string, pluginId: number): Promise<ViteInspectPluginCallInfo[]> {
    return this.readSnapshot(() => this.pluginCalls.read(scope, pluginId))
  }

  async getFirstResolveResult(scope: string, sourceId: string): Promise<string | undefined> {
    await this.flush()
    return this.scopes.get(scope)?.resolveIds.get(sourceId)?.[0]?.result
  }

  async findModuleId(scope: string, publicModuleId: string): Promise<string | undefined> {
    await this.flush()
    const data = this.scopes.get(scope)
    if (!data)
      return undefined

    for (const [moduleId, transforms] of data.transforms) {
      if (transforms.publicModuleId === publicModuleId)
        return moduleId
    }
    for (const resolveIds of data.resolveIds.values()) {
      const matched = resolveIds.find(resolveId => resolveId.resultPublicId === publicModuleId)
      if (matched)
        return matched.result
    }
    return undefined
  }

  async getModuleIds(scope: string): Promise<string[]> {
    await this.flush()
    const data = this.scopes.get(scope)
    if (!data)
      return []

    const moduleIds = new Set(data.transforms.keys())
    for (const resolveIds of data.resolveIds.values()) {
      for (const resolveId of resolveIds)
        moduleIds.add(resolveId.result)
    }
    return Array.from(moduleIds)
  }

  getStats(): ViteInspectStoreStats {
    return {
      maxBatchItems: this.maxBatchItems,
      maxBatchBytes: this.maxBatchBytes,
      queuedItems: this.queuedItems,
      queuedBytes: this.queuedBytes,
      inFlightItems: this.inFlightItems,
      peakQueuedItems: this.peakQueuedItems,
      peakQueuedBytes: this.peakQueuedBytes,
      writeBatches: this.writeBatches,
    }
  }

  async flush(): Promise<void> {
    this.throwWriteError()
    while (this.queuedItems > 0 || this.scheduledPump || this.pumpPromise) {
      if (this.scheduledPump) {
        clearImmediate(this.scheduledPump)
        this.scheduledPump = undefined
      }
      this.startPump()
      if (this.pumpPromise)
        await this.pumpPromise
    }
    await this.pluginCalls.flush()
    this.throwWriteError()
  }

  async close(): Promise<void> {
    this.closePromise ||= this.closeInternal()
    await this.closePromise
  }

  private enqueue(write: QueuedWrite): void {
    if (this.closing || this.closed || this.lastWriteError)
      return

    const estimatedBytes = estimateWriteBytes(write)
    this.queue.push({ write, estimatedBytes })
    this.queuedItems += 1
    this.queuedBytes += estimatedBytes
    this.peakQueuedItems = Math.max(this.peakQueuedItems, this.queuedItems)
    this.peakQueuedBytes = Math.max(this.peakQueuedBytes, this.queuedBytes)
    this.schedulePump()
  }

  private schedulePump(): void {
    if (this.scheduledPump || this.pumpPromise || this.queuedItems === 0)
      return
    this.scheduledPump = setImmediate(() => {
      this.scheduledPump = undefined
      this.startPump()
    })
  }

  private startPump(): void {
    if (this.pumpPromise || this.queuedItems === 0 || this.lastWriteError)
      return

    this.pumpPromise = this.drainQueue()
      .catch((error) => {
        this.lastWriteError = toError(error)
        reportStorageError('writing the inspect archives', error)
      })
      .finally(() => {
        this.pumpPromise = undefined
        this.inFlightItems = 0
        if (this.queuedItems > 0 && !this.lastWriteError)
          this.schedulePump()
      })
  }

  private async drainQueue(): Promise<void> {
    while (this.queuedItems > 0) {
      await this.waitForReaders()
      const batch = this.takeBatch()
      this.inFlightItems = batch.length
      this.writeBatches += 1
      await this.writeBatch(batch)
      this.inFlightItems = 0
    }
  }

  private takeBatch(): PendingWrite[] {
    const batch: PendingWrite[] = []
    let batchBytes = 0

    while (this.queueHead < this.queue.length && batch.length < this.maxBatchItems) {
      const pending = this.queue[this.queueHead]!
      if (batch.length > 0 && batchBytes + pending.estimatedBytes > this.maxBatchBytes)
        break
      batch.push(pending)
      batchBytes += pending.estimatedBytes
      this.queue[this.queueHead] = undefined
      this.queueHead += 1
    }

    this.queuedItems -= batch.length
    this.queuedBytes = Math.max(0, this.queuedBytes - batchBytes)
    if (this.queueHead === this.queue.length) {
      this.queue = []
      this.queueHead = 0
    }
    else if (this.queueHead >= 4096 && this.queueHead * 2 >= this.queue.length) {
      this.queue = this.queue.slice(this.queueHead)
      this.queueHead = 0
    }
    return batch
  }

  private async writeBatch(batch: PendingWrite[]): Promise<void> {
    let dataWrites: Array<Exclude<QueuedWrite, { operation: 'invalidate' | 'clearScope' }>> = []
    const flushDataWrites = async () => {
      if (dataWrites.length === 0)
        return
      const current = dataWrites
      dataWrites = []
      await this.writeDataBatch(current)
    }

    for (const { write } of batch) {
      if (write.operation === 'invalidate') {
        await flushDataWrites()
        this.invalidateNow(write.scope, write.moduleId, write.publicModuleId)
      }
      else if (write.operation === 'clearScope') {
        await flushDataWrites()
        this.clearScopeNow(write.scope)
      }
      else {
        dataWrites.push(write)
      }
    }
    await flushDataWrites()
  }

  private async writeDataBatch(
    writes: Array<Exclude<QueuedWrite, { operation: 'invalidate' | 'clearScope' }>>,
  ): Promise<void> {
    const values: Array<string | null | undefined> = []
    const prepared: PreparedWrite[] = []
    const pluginCallWrites: InspectPluginCallWrite[] = []
    const sourceState = new Map<string, boolean>()

    const hasSource = (scope: string, moduleId: string): boolean => {
      const key = scopeKey(scope, moduleId)
      const pending = sourceState.get(key)
      if (pending != null)
        return pending
      const stored = this.scopes.get(scope)?.transforms.get(moduleId)?.items.some(item => item.hasResult) ?? false
      sourceState.set(key, stored)
      return stored
    }

    for (const write of writes) {
      const pluginCall = getQueuedPluginCall(write)
      if (pluginCall) {
        pluginCallWrites.push({
          scope: write.scope,
          info: pluginCall,
        })
      }
      if (write.operation === 'recordPluginCall')
        continue

      const item: PreparedWrite = { write }
      if (write.operation === 'recordTransform') {
        const key = scopeKey(write.scope, write.moduleId)
        if (!hasSource(write.scope, write.moduleId)) {
          item.sourceIndex = values.push(write.preTransformCode) - 1
          sourceState.set(key, true)
        }
        item.resultIndex = values.push(write.info.result) - 1
        item.sourcemapIndex = pushSerializedPayload(values, write.info.sourcemaps)
      }
      else if (write.operation === 'recordLoad') {
        item.resultIndex = values.push(write.info.result) - 1
        item.sourcemapIndex = pushSerializedPayload(values, write.info.sourcemaps)
        sourceState.set(scopeKey(write.scope, write.moduleId), write.info.result != null)
      }
      prepared.push(item)
    }

    const [ranges] = await Promise.all([
      values.length > 0 ? this.payloads.write(values) : Promise.resolve([]),
      this.pluginCalls.write(pluginCallWrites),
    ])
    for (const item of prepared)
      this.applyPreparedWrite(item, ranges)
  }

  private applyPreparedWrite(
    prepared: PreparedWrite,
    ranges: Array<ViteInspectPayloadRange | undefined>,
  ): void {
    const { write } = prepared
    if (write.operation === 'recordTransform') {
      this.applyTransform(
        write,
        rangeAt(ranges, prepared.resultIndex),
        rangeAt(ranges, prepared.sourceIndex),
        rangeAt(ranges, prepared.sourcemapIndex),
      )
    }
    else if (write.operation === 'recordLoad') {
      this.applyLoad(
        write,
        rangeAt(ranges, prepared.resultIndex),
        rangeAt(ranges, prepared.sourcemapIndex),
      )
    }
    else if (write.operation === 'recordResolveId') {
      const data = this.getScope(write.scope)
      let resolveIds = data.resolveIds.get(write.sourceId)
      if (!resolveIds) {
        resolveIds = []
        data.resolveIds.set(write.sourceId, resolveIds)
      }
      resolveIds.push({
        sourceId: write.sourceId,
        sourcePublicId: write.sourcePublicId,
        result: write.info.result,
        resultPublicId: write.resultPublicId,
        name: write.info.name,
        pluginId: write.info.plugin_id,
        start: write.info.start,
        end: write.info.end,
      })
    }
  }

  private applyTransform(
    write: Extract<QueuedWrite, { operation: 'recordTransform' }>,
    result: ViteInspectPayloadRange | undefined,
    source: ViteInspectPayloadRange | undefined,
    sourcemaps: ViteInspectPayloadRange | undefined,
  ): void {
    const data = this.getScope(write.scope)
    let transforms = data.transforms.get(write.moduleId)
    if (!transforms) {
      transforms = {
        publicModuleId: write.publicModuleId,
        invokeCount: 0,
        items: [],
      }
      data.transforms.set(write.moduleId, transforms)
    }

    if (!transforms.items.some(item => item.hasResult)) {
      transforms.items.push({
        name: DUMMY_LOAD_PLUGIN_NAME,
        hasResult: true,
        result: source,
        resultSize: source?.length ?? 0,
        start: write.info.start,
        end: write.info.start,
        sourcemaps,
      })
      transforms.invokeCount += 1
    }
    transforms.items.push(toStoredTransformInfo(write.info, result, sourcemaps))
  }

  private applyLoad(
    write: Extract<QueuedWrite, { operation: 'recordLoad' }>,
    result: ViteInspectPayloadRange | undefined,
    sourcemaps: ViteInspectPayloadRange | undefined,
  ): void {
    const data = this.getScope(write.scope)
    const existing = data.transforms.get(write.moduleId)
    if (existing)
      this.payloads.reclaim(collectPayloadRanges(existing.items))
    data.transforms.set(write.moduleId, {
      publicModuleId: write.publicModuleId,
      invokeCount: (existing?.invokeCount ?? 0) + 1,
      items: [toStoredTransformInfo(write.info, result, sourcemaps)],
    })
  }

  private invalidateNow(scope: string, moduleId: string, publicModuleId: string): void {
    const data = this.scopes.get(scope)
    if (!data) {
      this.pluginCalls.invalidate(scope, new Set([publicModuleId]))
      return
    }

    const invalidIds = new Set([moduleId])
    const invalidPublicIds = new Set([publicModuleId])
    let changed = true
    while (changed) {
      changed = false
      for (const [id, transforms] of data.transforms) {
        if (invalidIds.has(id) || invalidPublicIds.has(transforms.publicModuleId))
          changed = addInvalidId(invalidIds, invalidPublicIds, id, transforms.publicModuleId) || changed
      }
      for (const resolveIds of data.resolveIds.values()) {
        for (const resolveId of resolveIds) {
          if (!matchesInvalid(resolveId.sourceId, resolveId.sourcePublicId, invalidIds, invalidPublicIds)
            && !matchesInvalid(resolveId.result, resolveId.resultPublicId, invalidIds, invalidPublicIds)) {
            continue
          }
          changed = addInvalidId(invalidIds, invalidPublicIds, resolveId.sourceId, resolveId.sourcePublicId) || changed
          changed = addInvalidId(invalidIds, invalidPublicIds, resolveId.result, resolveId.resultPublicId) || changed
        }
      }
    }

    const reclaimed: ViteInspectPayloadRange[] = []
    for (const [id, transforms] of data.transforms) {
      if (!matchesInvalid(id, transforms.publicModuleId, invalidIds, invalidPublicIds))
        continue
      reclaimed.push(...collectPayloadRanges(transforms.items))
      data.transforms.delete(id)
    }
    this.payloads.reclaim(reclaimed)

    for (const [sourceId, resolveIds] of data.resolveIds) {
      const remaining = resolveIds.filter((resolveId) => {
        return !matchesInvalid(sourceId, resolveId.sourcePublicId, invalidIds, invalidPublicIds)
          && !matchesInvalid(resolveId.result, resolveId.resultPublicId, invalidIds, invalidPublicIds)
      })
      if (remaining.length > 0)
        data.resolveIds.set(sourceId, remaining)
      else
        data.resolveIds.delete(sourceId)
    }

    this.pluginCalls.invalidate(scope, invalidPublicIds)
  }

  private clearScopeNow(scope: string): void {
    const data = this.scopes.get(scope)
    if (!data) {
      this.pluginCalls.clearScope(scope)
      return
    }
    const ranges: ViteInspectPayloadRange[] = []
    for (const transforms of data.transforms.values())
      ranges.push(...collectPayloadRanges(transforms.items))
    this.payloads.reclaim(ranges)
    this.pluginCalls.clearScope(scope)
    this.scopes.delete(scope)
  }

  private async restoreTransformInfo(info: StoredViteInspectTransformInfo): Promise<ViteInspectTransformInfo> {
    const [result, sourcemaps] = await Promise.all([
      info.result ? this.payloads.read(info.result) : undefined,
      info.sourcemaps ? this.payloads.read(info.sourcemaps) : undefined,
    ])
    return {
      name: info.name,
      plugin_id: info.pluginId,
      result: info.hasResult ? result : undefined,
      start: info.start,
      end: info.end,
      order: info.order,
      sourcemaps: sourcemaps == null ? undefined : parsePayload(sourcemaps),
      error: info.error,
    }
  }

  private async readSnapshot<T>(read: () => Promise<T>): Promise<T> {
    await this.flush()
    this.activeReaders += 1
    try {
      return await read()
    }
    finally {
      this.activeReaders -= 1
      if (this.activeReaders === 0) {
        for (const resolve of this.readerWaiters.splice(0))
          resolve()
      }
    }
  }

  private waitForReaders(): Promise<void> | undefined {
    if (this.activeReaders === 0)
      return undefined
    return new Promise((resolve) => {
      this.readerWaiters.push(resolve)
    })
  }

  private getScope(scope: string): ScopeData {
    let data = this.scopes.get(scope)
    if (!data) {
      data = {
        transforms: new Map(),
        resolveIds: new Map(),
      }
      this.scopes.set(scope, data)
    }
    return data
  }

  private async closeInternal(): Promise<void> {
    this.closing = true
    let thrownError: unknown
    try {
      await this.flush()
    }
    catch (error) {
      thrownError = error
    }

    if (this.scheduledPump) {
      clearImmediate(this.scheduledPump)
      this.scheduledPump = undefined
    }
    try {
      await this.payloads.close()
    }
    catch (error) {
      thrownError ??= error
      reportStorageError('closing the payload archive', error)
    }
    try {
      await this.pluginCalls.close()
    }
    catch (error) {
      thrownError ??= error
      reportStorageError('closing the plugin call archive', error)
    }
    this.queue = []
    this.queueHead = 0
    this.queuedItems = 0
    this.queuedBytes = 0
    this.scopes.clear()
    this.closed = true

    if (thrownError)
      throw thrownError
  }

  private throwWriteError(): void {
    if (this.lastWriteError)
      throw this.lastWriteError
  }
}

function addMetric(
  metrics: Map<string, ViteInspectPluginMetricItem>,
  pluginId: number | undefined,
  pluginName: string,
  duration: number,
): void {
  const key = pluginId == null || pluginId < 0 ? pluginName : String(pluginId)
  let metric = metrics.get(key)
  if (!metric) {
    metric = {
      pluginId,
      pluginName,
      invokeCount: 0,
      totalTime: 0,
    }
    metrics.set(key, metric)
  }
  metric.invokeCount += 1
  metric.totalTime += duration
}

function addInvalidId(
  ids: Set<string>,
  publicIds: Set<string>,
  id: string,
  publicId: string,
): boolean {
  const idSize = ids.size
  const publicIdSize = publicIds.size
  ids.add(id)
  publicIds.add(publicId)
  return ids.size !== idSize || publicIds.size !== publicIdSize
}

function matchesInvalid(
  id: string,
  publicId: string,
  ids: Set<string>,
  publicIds: Set<string>,
): boolean {
  return ids.has(id) || publicIds.has(publicId)
}

function collectPayloadRanges(items: StoredViteInspectTransformInfo[]): ViteInspectPayloadRange[] {
  const ranges = new Map<string, ViteInspectPayloadRange>()
  for (const item of items) {
    for (const range of [item.result, item.sourcemaps]) {
      if (range)
        ranges.set(`${range.offset}:${range.length}`, range)
    }
  }
  return Array.from(ranges.values())
}

function toStoredTransformInfo(
  info: ViteInspectTransformInfo,
  result: ViteInspectPayloadRange | undefined,
  sourcemaps: ViteInspectPayloadRange | undefined,
): StoredViteInspectTransformInfo {
  return {
    name: info.name,
    pluginId: info.plugin_id,
    hasResult: info.result != null,
    result,
    resultSize: result?.length ?? 0,
    start: info.start,
    end: info.end,
    order: info.order,
    sourcemaps,
    error: info.error,
  }
}

function pushSerializedPayload(
  values: Array<string | null | undefined>,
  value: unknown,
): number | undefined {
  const serialized = serializePayload(value)
  if (serialized == null)
    return undefined
  return values.push(serialized) - 1
}

function serializePayload(value: unknown): string | undefined {
  if (value == null)
    return undefined
  try {
    return JSON.stringify(value)
  }
  catch {
    return JSON.stringify(String(value))
  }
}

function parsePayload(value: string): unknown {
  try {
    return JSON.parse(value)
  }
  catch {
    return undefined
  }
}

function rangeAt(
  ranges: Array<ViteInspectPayloadRange | undefined>,
  index: number | undefined,
): ViteInspectPayloadRange | undefined {
  return index == null ? undefined : ranges[index]
}

function scopeKey(scope: string, moduleId: string): string {
  return `${scope}\0${moduleId}`
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && value! > 0
    ? Math.max(1, Math.floor(value!))
    : fallback
}

function estimateWriteBytes(write: QueuedWrite): number {
  const pluginCall = write.operation === 'invalidate' || write.operation === 'clearScope'
    ? undefined
    : getQueuedPluginCall(write)
  const pluginCallBytes = pluginCall
    ? (48
      + estimateStringBytes(pluginCall.id)
      + estimateStringBytes(pluginCall.plugin_name)
      + estimateStringBytes(pluginCall.module))
    : 0
  if (write.operation === 'recordTransform') {
    return pluginCallBytes
      + estimateStringBytes(write.info.result)
      + estimateStringBytes(write.preTransformCode)
      + estimateTopLevelSourcemapBytes(write.info.sourcemaps)
  }
  if (write.operation === 'recordLoad') {
    return pluginCallBytes
      + estimateStringBytes(write.info.result)
      + estimateTopLevelSourcemapBytes(write.info.sourcemaps)
  }
  return pluginCallBytes
}

function getQueuedPluginCall(
  write: Exclude<QueuedWrite, { operation: 'invalidate' | 'clearScope' }>,
): ViteInspectPluginCallInfo | undefined {
  return write.operation === 'recordPluginCall' ? write.info : write.pluginCall
}

function estimateStringBytes(value: unknown): number {
  return typeof value === 'string' ? value.length * 2 : 0
}

function estimateTopLevelSourcemapBytes(value: unknown): number {
  if (value == null)
    return 0
  if (typeof value === 'string')
    return value.length * 2
  if (typeof value !== 'object')
    return 0
  const mappings = (value as { mappings?: unknown }).mappings
  return estimateStringBytes(mappings)
}

function reportStorageError(operation: string, error: unknown): void {
  diagnostics.VDT0003({ operation, cause: toError(error) }, { method: 'error' })
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}
