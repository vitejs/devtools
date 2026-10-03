import type { FileHandle } from 'node:fs/promises'
import type {
  ViteInspectPluginCallInfo,
  ViteInspectPluginCallType,
} from '../types'
import { Buffer } from 'node:buffer'
import { open } from 'node:fs/promises'
import { diagnostics } from '../../diagnostics'

const RECORD_SIZE = 40
const RECORDS_PER_SEGMENT = 256
const SEGMENT_HEADER_SIZE = 32
const RECENT_SEGMENT_CACHE_SIZE = 64
const SLOT_STATE_CHUNK_SIZE = 64 * 1024
const NO_SEGMENT = 0xFFFF_FFFF_FFFF_FFFFn

const TYPE_RESOLVE = 0
const TYPE_LOAD = 1
const TYPE_TRANSFORM = 2

const FLAG_HAS_UNCHANGED = 1 << 0
const FLAG_UNCHANGED = 1 << 1

const OFFSET_HEADER_SCOPE_ID = 0
const OFFSET_HEADER_PLUGIN_ID = 4
const OFFSET_HEADER_PLUGIN_NAME_ID = 8
const OFFSET_HEADER_TYPE = 12
const OFFSET_HEADER_RECORD_COUNT = 16
const OFFSET_HEADER_PREVIOUS_SEGMENT = 24

const OFFSET_SLOT = 0
const OFFSET_MODULE_ID = 4
const OFFSET_SEQUENCE = 8
const OFFSET_START = 16
const OFFSET_END = 24
const OFFSET_FLAGS = 32

export interface InspectPluginCallWrite {
  scope: string
  info: ViteInspectPluginCallInfo
}

export interface InspectPluginCallStore {
  write: (calls: InspectPluginCallWrite[]) => Promise<void>
  read: (scope: string, pluginId: number) => Promise<ViteInspectPluginCallInfo[]>
  invalidate: (scope: string, modules: Set<string>) => void
  clearScope: (scope: string) => void
  flush: () => Promise<void>
  close: () => Promise<void>
}

interface PluginTypeState {
  pluginId: number
  type: ViteInspectPluginCallType
  headOffset?: number
  pendingPluginNameId?: number
  pendingRecords: Buffer
  pendingCount: number
  recentSegments: SegmentRef[]
}

interface SegmentRef {
  offset: number
  previousOffset?: number
  pluginNameId: number
  recordCount: number
}

interface ScopeState {
  id: number
  activeCalls: number
  moduleIds: Map<string, number>
  moduleNames: string[]
  moduleHeads: number[]
  pluginNameIds: Map<string, number>
  pluginNames: string[]
  pluginTypes: Map<string, PluginTypeState>
}

interface PendingSegment {
  scope: ScopeState
  pluginType: PluginTypeState
  pluginNameId: number
  records: Buffer
  recordCount: number
}

interface PluginCallStorage {
  write: (buffers: Buffer[], position: number) => Promise<void>
  read: (position: number, length: number) => Promise<Buffer>
  close: () => Promise<void>
}

export async function createInspectPluginCallStore(filename?: string): Promise<InspectPluginCallStore> {
  const storage: PluginCallStorage = filename
    ? new FilePluginCallStorage(await open(filename, 'w+'))
    : new MemoryPluginCallStorage()
  return new BinaryInspectPluginCallStore(storage)
}

class BinaryInspectPluginCallStore implements InspectPluginCallStore {
  private readonly scopes = new Map<string, ScopeState>()
  private readonly activeChunks: Uint8Array[] = []
  private readonly nextSlotChunks: Uint32Array[] = []
  private nextScopeId = 0
  private nextSlot = 0
  private nextFileOffset = 0
  private writeGate: Promise<void> = Promise.resolve()
  private lastWriteError?: Error

  constructor(private readonly storage: PluginCallStorage) {}

  async write(calls: InspectPluginCallWrite[]): Promise<void> {
    this.throwWriteError()
    if (calls.length === 0)
      return

    const completedSegments: PendingSegment[] = []
    for (const call of calls) {
      validateCall(call.info)

      const scope = this.getScope(call.scope)
      const moduleId = internString(scope.moduleIds, scope.moduleNames, call.info.module)
      const pluginNameId = internString(scope.pluginNameIds, scope.pluginNames, call.info.plugin_name)
      const pluginType = this.getPluginType(scope, call.info.plugin_id, call.info.type)
      if (pluginType.pendingCount > 0 && pluginType.pendingPluginNameId !== pluginNameId)
        completedSegments.push(this.takePendingSegment(scope, pluginType))

      const slot = this.allocateSlot()
      const offset = pluginType.pendingCount * RECORD_SIZE
      this.setNextSlot(slot, scope.moduleHeads[moduleId] ?? 0)
      scope.moduleHeads[moduleId] = slot + 1
      scope.activeCalls += 1
      this.setActive(slot, true)
      pluginType.pendingPluginNameId = pluginNameId
      encodeCall(pluginType.pendingRecords, offset, slot, moduleId, call.info)
      pluginType.pendingCount += 1

      if (pluginType.pendingCount === RECORDS_PER_SEGMENT)
        completedSegments.push(this.takePendingSegment(scope, pluginType))
    }

    await this.writeSegments(completedSegments)
  }

  async read(scopeName: string, pluginId: number): Promise<ViteInspectPluginCallInfo[]> {
    const scope = this.scopes.get(scopeName)
    if (!scope || scope.activeCalls === 0)
      return []

    const calls: ViteInspectPluginCallInfo[] = []
    let processedRecords = 0
    for (const pluginType of scope.pluginTypes.values()) {
      if (pluginType.pluginId !== pluginId)
        continue

      let segmentOffset = pluginType.headOffset
      const recentSegments: SegmentRef[] = []
      for (let index = pluginType.recentSegments.length - 1; index >= 0; index--) {
        const segment = pluginType.recentSegments[index]!
        if (segment.offset !== segmentOffset)
          break
        recentSegments.push(segment)
        segmentOffset = segment.previousOffset
      }
      const recentRecords = await Promise.all(recentSegments.map(async (segment) => {
        const records = await this.storage.read(
          segment.offset + SEGMENT_HEADER_SIZE,
          segment.recordCount * RECORD_SIZE,
        )
        if (records.length < segment.recordCount * RECORD_SIZE) {
          throw diagnostics.VDT0003({
            operation: 'reading the indexed inspect plugin call segment',
          })
        }
        return { segment, records }
      }))
      for (const { segment, records } of recentRecords) {
        this.decodeRecords(
          calls,
          records,
          segment.recordCount,
          pluginType.type,
          pluginType.pluginId,
          segment.pluginNameId,
          scope,
        )
        processedRecords += segment.recordCount
      }
      if (processedRecords >= 4096) {
        processedRecords = 0
        await yieldToEventLoop()
      }

      while (segmentOffset != null) {
        const segment = await this.storage.read(
          segmentOffset,
          SEGMENT_HEADER_SIZE + RECORDS_PER_SEGMENT * RECORD_SIZE,
        )
        const recordCount = segment.readUInt32LE(OFFSET_HEADER_RECORD_COUNT)
        const requiredLength = SEGMENT_HEADER_SIZE + recordCount * RECORD_SIZE
        if (segment.length < requiredLength) {
          throw diagnostics.VDT0003({
            operation: 'reading the inspect plugin call segment',
          })
        }
        const type = decodeType(segment.readUInt8(OFFSET_HEADER_TYPE))
        const storedPluginId = segment.readUInt32LE(OFFSET_HEADER_PLUGIN_ID)
        const pluginNameId = segment.readUInt32LE(OFFSET_HEADER_PLUGIN_NAME_ID)
        this.decodeRecords(
          calls,
          segment.subarray(SEGMENT_HEADER_SIZE, requiredLength),
          recordCount,
          type,
          storedPluginId,
          pluginNameId,
          scope,
        )

        processedRecords += recordCount
        if (processedRecords >= 4096) {
          processedRecords = 0
          await yieldToEventLoop()
        }
        const previousSegment = segment.readBigUInt64LE(OFFSET_HEADER_PREVIOUS_SEGMENT)
        segmentOffset = previousSegment === NO_SEGMENT ? undefined : Number(previousSegment)
      }
    }
    calls.sort((a, b) => callSequence(a.id) - callSequence(b.id))
    return calls
  }

  invalidate(scopeName: string, modules: Set<string>): void {
    const scope = this.scopes.get(scopeName)
    if (!scope)
      return

    for (const module of modules) {
      const moduleId = scope.moduleIds.get(module)
      if (moduleId == null)
        continue
      this.releaseModuleSlots(scope, moduleId)
    }
  }

  clearScope(scopeName: string): void {
    const scope = this.scopes.get(scopeName)
    if (!scope)
      return
    for (let moduleId = 0; moduleId < scope.moduleHeads.length; moduleId++)
      this.releaseModuleSlots(scope, moduleId)
    this.scopes.delete(scopeName)
  }

  async flush(): Promise<void> {
    this.throwWriteError()
    const pendingSegments: PendingSegment[] = []
    for (const scope of this.scopes.values()) {
      for (const pluginType of scope.pluginTypes.values()) {
        if (pluginType.pendingCount > 0)
          pendingSegments.push(this.takePendingSegment(scope, pluginType))
      }
    }
    if (pendingSegments.length > 0)
      await this.writeSegments(pendingSegments)
    else
      await this.writeGate
    this.throwWriteError()
  }

  async close(): Promise<void> {
    let thrownError: unknown
    try {
      await this.flush()
    }
    catch (error) {
      thrownError = error
    }
    this.scopes.clear()
    this.activeChunks.length = 0
    this.nextSlotChunks.length = 0
    try {
      await this.storage.close()
    }
    catch (error) {
      thrownError ??= error
    }
    if (thrownError)
      throw thrownError
  }

  private getScope(scopeName: string): ScopeState {
    let scope = this.scopes.get(scopeName)
    if (scope)
      return scope
    if (this.nextScopeId > 0xFFFF_FFFF) {
      throw diagnostics.VDT0003({
        operation: 'allocating an inspect plugin call scope',
      })
    }
    scope = {
      id: this.nextScopeId++,
      activeCalls: 0,
      moduleIds: new Map(),
      moduleNames: [],
      moduleHeads: [],
      pluginNameIds: new Map(),
      pluginNames: [],
      pluginTypes: new Map(),
    }
    this.scopes.set(scopeName, scope)
    return scope
  }

  private getPluginType(
    scope: ScopeState,
    pluginId: number,
    type: ViteInspectPluginCallType,
  ): PluginTypeState {
    const key = `${pluginId}:${type}`
    let pluginType = scope.pluginTypes.get(key)
    if (!pluginType) {
      pluginType = {
        pluginId,
        type,
        pendingRecords: Buffer.allocUnsafe(RECORDS_PER_SEGMENT * RECORD_SIZE),
        pendingCount: 0,
        recentSegments: [],
      }
      scope.pluginTypes.set(key, pluginType)
    }
    return pluginType
  }

  private takePendingSegment(scope: ScopeState, pluginType: PluginTypeState): PendingSegment {
    const recordCount = pluginType.pendingCount
    const records = pluginType.pendingRecords.subarray(0, recordCount * RECORD_SIZE)
    const pluginNameId = pluginType.pendingPluginNameId!
    pluginType.pendingRecords = Buffer.allocUnsafe(RECORDS_PER_SEGMENT * RECORD_SIZE)
    pluginType.pendingCount = 0
    pluginType.pendingPluginNameId = undefined
    return {
      scope,
      pluginType,
      pluginNameId,
      records,
      recordCount,
    }
  }

  private async writeSegments(segments: PendingSegment[]): Promise<void> {
    if (segments.length === 0)
      return

    const buffers: Buffer[] = []
    const startPosition = this.nextFileOffset
    for (const segment of segments) {
      const segmentOffset = this.nextFileOffset
      const previousOffset = segment.pluginType.headOffset
      const header = Buffer.alloc(SEGMENT_HEADER_SIZE)
      header.writeUInt32LE(segment.scope.id, OFFSET_HEADER_SCOPE_ID)
      header.writeUInt32LE(segment.pluginType.pluginId, OFFSET_HEADER_PLUGIN_ID)
      header.writeUInt32LE(segment.pluginNameId, OFFSET_HEADER_PLUGIN_NAME_ID)
      header.writeUInt8(encodeType(segment.pluginType.type), OFFSET_HEADER_TYPE)
      header.writeUInt32LE(segment.recordCount, OFFSET_HEADER_RECORD_COUNT)
      header.writeBigUInt64LE(
        previousOffset == null ? NO_SEGMENT : BigInt(previousOffset),
        OFFSET_HEADER_PREVIOUS_SEGMENT,
      )
      segment.pluginType.headOffset = segmentOffset
      segment.pluginType.recentSegments.push({
        offset: segmentOffset,
        previousOffset,
        pluginNameId: segment.pluginNameId,
        recordCount: segment.recordCount,
      })
      if (segment.pluginType.recentSegments.length > RECENT_SEGMENT_CACHE_SIZE)
        segment.pluginType.recentSegments.shift()
      buffers.push(header, segment.records)
      this.nextFileOffset += header.length + segment.records.length
    }
    const write = this.writeGate.then(() => this.storage.write(buffers, startPosition))
    this.writeGate = write.catch((error) => {
      this.lastWriteError = toError(error)
    })
    await write
  }

  private allocateSlot(): number {
    if (this.nextSlot > 0xFFFF_FFFE) {
      throw diagnostics.VDT0003({
        operation: 'allocating an inspect plugin call slot',
      })
    }
    const slot = this.nextSlot++
    this.ensureSlotState(slot)
    return slot
  }

  private decodeRecords(
    calls: ViteInspectPluginCallInfo[],
    records: Buffer,
    recordCount: number,
    type: ViteInspectPluginCallType,
    pluginId: number,
    pluginNameId: number,
    scope: ScopeState,
  ): void {
    for (let index = 0; index < recordCount; index++) {
      const offset = index * RECORD_SIZE
      const slot = records.readUInt32LE(offset + OFFSET_SLOT)
      if (!this.isActive(slot))
        continue
      calls.push(decodeCall(records, offset, type, pluginId, pluginNameId, scope))
    }
  }

  private releaseModuleSlots(scope: ScopeState, moduleId: number): void {
    let head = scope.moduleHeads[moduleId] ?? 0
    scope.moduleHeads[moduleId] = 0
    while (head > 0) {
      const slot = head - 1
      const next = this.getNextSlot(slot)
      if (this.isActive(slot)) {
        this.setActive(slot, false)
        scope.activeCalls -= 1
      }
      head = next
    }
  }

  private ensureSlotState(slot: number): void {
    const chunkIndex = Math.floor(slot / SLOT_STATE_CHUNK_SIZE)
    while (this.activeChunks.length <= chunkIndex) {
      this.activeChunks.push(new Uint8Array(SLOT_STATE_CHUNK_SIZE))
      this.nextSlotChunks.push(new Uint32Array(SLOT_STATE_CHUNK_SIZE))
    }
  }

  private isActive(slot: number): boolean {
    const chunkIndex = Math.floor(slot / SLOT_STATE_CHUNK_SIZE)
    return this.activeChunks[chunkIndex]?.[slot % SLOT_STATE_CHUNK_SIZE] === 1
  }

  private setActive(slot: number, active: boolean): void {
    this.ensureSlotState(slot)
    this.activeChunks[Math.floor(slot / SLOT_STATE_CHUNK_SIZE)]![slot % SLOT_STATE_CHUNK_SIZE] = active ? 1 : 0
  }

  private getNextSlot(slot: number): number {
    return this.nextSlotChunks[Math.floor(slot / SLOT_STATE_CHUNK_SIZE)]![slot % SLOT_STATE_CHUNK_SIZE]!
  }

  private setNextSlot(slot: number, next: number): void {
    this.ensureSlotState(slot)
    this.nextSlotChunks[Math.floor(slot / SLOT_STATE_CHUNK_SIZE)]![slot % SLOT_STATE_CHUNK_SIZE] = next
  }

  private throwWriteError(): void {
    if (this.lastWriteError)
      throw this.lastWriteError
  }
}

class FilePluginCallStorage implements PluginCallStorage {
  constructor(private readonly file: FileHandle) {}

  async write(input: Buffer[], startPosition: number): Promise<void> {
    let buffers = input
    let position = startPosition
    while (buffers.length > 0) {
      const { bytesWritten } = await this.file.writev(buffers, position)
      if (bytesWritten === 0) {
        throw diagnostics.VDT0003({
          operation: 'writing the inspect plugin call archive',
        })
      }
      buffers = consumeBuffers(buffers, bytesWritten)
      position += bytesWritten
    }
  }

  async read(position: number, length: number): Promise<Buffer> {
    const buffer = Buffer.allocUnsafe(length)
    let offset = 0
    while (offset < buffer.length) {
      const { bytesRead } = await this.file.read(
        buffer,
        offset,
        buffer.length - offset,
        position + offset,
      )
      if (bytesRead === 0)
        break
      offset += bytesRead
    }
    return buffer.subarray(0, offset)
  }

  async close(): Promise<void> {
    await this.file.close()
  }
}

class MemoryPluginCallStorage implements PluginCallStorage {
  private buffer = Buffer.alloc(0)

  async write(buffers: Buffer[], position: number): Promise<void> {
    const length = buffers.reduce((total, buffer) => total + buffer.length, 0)
    const requiredBytes = position + length
    if (requiredBytes > this.buffer.length) {
      const next = Buffer.allocUnsafe(Math.max(requiredBytes, this.buffer.length * 2, 64 * 1024))
      this.buffer.copy(next)
      this.buffer = next
    }
    let offset = position
    for (const buffer of buffers) {
      buffer.copy(this.buffer, offset)
      offset += buffer.length
    }
  }

  async read(position: number, length: number): Promise<Buffer> {
    return this.buffer.subarray(position, position + length)
  }

  async close(): Promise<void> {
    this.buffer = Buffer.alloc(0)
  }
}

function validateCall(info: ViteInspectPluginCallInfo): void {
  const sequence = callSequence(info.id)
  if (!Number.isSafeInteger(sequence) || sequence < 0 || info.plugin_id < 0 || info.plugin_id > 0xFFFF_FFFF) {
    throw diagnostics.VDT0003({
      operation: 'encoding an inspect plugin call',
    })
  }
}

function encodeCall(
  buffer: Buffer,
  offset: number,
  slot: number,
  moduleId: number,
  info: ViteInspectPluginCallInfo,
): void {
  buffer.writeUInt32LE(slot, offset + OFFSET_SLOT)
  buffer.writeUInt32LE(moduleId, offset + OFFSET_MODULE_ID)
  buffer.writeDoubleLE(callSequence(info.id), offset + OFFSET_SEQUENCE)
  buffer.writeDoubleLE(info.timestamp_start, offset + OFFSET_START)
  buffer.writeDoubleLE(info.timestamp_end, offset + OFFSET_END)
  buffer.writeUInt8(
    info.unchanged == null
      ? 0
      : FLAG_HAS_UNCHANGED | (info.unchanged ? FLAG_UNCHANGED : 0),
    offset + OFFSET_FLAGS,
  )
  buffer.fill(0, offset + OFFSET_FLAGS + 1, offset + RECORD_SIZE)
}

function decodeCall(
  buffer: Buffer,
  offset: number,
  type: ViteInspectPluginCallType,
  pluginId: number,
  pluginNameId: number,
  scope: ScopeState,
): ViteInspectPluginCallInfo {
  const moduleId = buffer.readUInt32LE(offset + OFFSET_MODULE_ID)
  const flags = buffer.readUInt8(offset + OFFSET_FLAGS)
  const sequence = buffer.readDoubleLE(offset + OFFSET_SEQUENCE)
  const start = buffer.readDoubleLE(offset + OFFSET_START)
  const end = buffer.readDoubleLE(offset + OFFSET_END)
  return {
    type,
    id: `${type}:${pluginId}:${sequence}`,
    duration: Math.max(0, end - start),
    plugin_id: pluginId,
    plugin_name: scope.pluginNames[pluginNameId]!,
    module: scope.moduleNames[moduleId]!,
    timestamp_start: start,
    timestamp_end: end,
    unchanged: flags & FLAG_HAS_UNCHANGED
      ? Boolean(flags & FLAG_UNCHANGED)
      : undefined,
  }
}

function consumeBuffers(input: Buffer[], bytes: number): Buffer[] {
  const buffers = input.slice()
  let consumed = bytes
  while (buffers.length > 0 && consumed >= buffers[0]!.length) {
    consumed -= buffers[0]!.length
    buffers.shift()
  }
  if (buffers.length > 0 && consumed > 0)
    buffers[0] = buffers[0]!.subarray(consumed)
  return buffers
}

function internString(ids: Map<string, number>, values: string[], value: string): number {
  const existing = ids.get(value)
  if (existing != null)
    return existing
  if (values.length > 0xFFFF_FFFF) {
    throw diagnostics.VDT0003({
      operation: 'interning inspect plugin call metadata',
    })
  }
  const id = values.length
  ids.set(value, id)
  values.push(value)
  return id
}

function callSequence(id: string): number {
  return Number(id.slice(id.lastIndexOf(':') + 1))
}

function encodeType(type: ViteInspectPluginCallType): number {
  if (type === 'resolve')
    return TYPE_RESOLVE
  if (type === 'load')
    return TYPE_LOAD
  return TYPE_TRANSFORM
}

function decodeType(type: number): ViteInspectPluginCallType {
  if (type === TYPE_RESOLVE)
    return 'resolve'
  if (type === TYPE_LOAD)
    return 'load'
  if (type === TYPE_TRANSFORM)
    return 'transform'
  throw diagnostics.VDT0003({
    operation: 'decoding an inspect plugin call',
  })
}

function yieldToEventLoop(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve))
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}
