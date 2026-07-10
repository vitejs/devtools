import type { FileHandle } from 'node:fs/promises'
import type {
  ViteInspectPluginCallInfo,
  ViteInspectPluginCallType,
} from '../types'
import { Buffer } from 'node:buffer'
import { open } from 'node:fs/promises'
import { diagnostics } from '../../diagnostics'

const RECORD_SIZE = 48
const READ_RECORDS_PER_CHUNK = 4096
const SLOT_STATE_CHUNK_SIZE = 64 * 1024

const TYPE_RESOLVE = 0
const TYPE_LOAD = 1
const TYPE_TRANSFORM = 2

const FLAG_HAS_UNCHANGED = 1 << 0
const FLAG_UNCHANGED = 1 << 1

const OFFSET_SCOPE_ID = 0
const OFFSET_MODULE_ID = 4
const OFFSET_PLUGIN_ID = 8
const OFFSET_PLUGIN_NAME_ID = 12
const OFFSET_SEQUENCE = 16
const OFFSET_START = 24
const OFFSET_END = 32
const OFFSET_TYPE = 40
const OFFSET_FLAGS = 41

export interface InspectPluginCallWrite {
  scope: string
  info: ViteInspectPluginCallInfo
}

export interface InspectPluginCallStore {
  write: (calls: InspectPluginCallWrite[]) => Promise<void>
  read: (scope: string, pluginId: number) => Promise<ViteInspectPluginCallInfo[]>
  invalidate: (scope: string, modules: Set<string>) => void
  clearScope: (scope: string) => void
  close: () => Promise<void>
}

interface ScopeState {
  id: number
  activeCalls: number
  moduleIds: Map<string, number>
  moduleNames: string[]
  moduleHeads: number[]
  pluginNameIds: Map<string, number>
  pluginNames: string[]
}

interface EncodedCall {
  slot: number
  sourceOffset: number
}

interface WriteChunk {
  startSlot: number
  buffer: Buffer
}

interface PluginCallStorage {
  write: (chunks: WriteChunk[]) => Promise<void>
  read: (startSlot: number, count: number) => Promise<Buffer>
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
  private freeHead = 0
  private nextScopeId = 0
  private slotCount = 0

  constructor(private readonly storage: PluginCallStorage) {}

  async write(calls: InspectPluginCallWrite[]): Promise<void> {
    if (calls.length === 0)
      return

    const buffer = Buffer.allocUnsafe(calls.length * RECORD_SIZE)
    const encoded: EncodedCall[] = []

    for (let index = 0; index < calls.length; index++) {
      const call = calls[index]!
      const scope = this.getScope(call.scope)
      const moduleId = internString(scope.moduleIds, scope.moduleNames, call.info.module)
      const pluginNameId = internString(scope.pluginNameIds, scope.pluginNames, call.info.plugin_name)
      const slot = this.allocateSlot()
      const offset = index * RECORD_SIZE

      this.setNextSlot(slot, scope.moduleHeads[moduleId] ?? 0)
      scope.moduleHeads[moduleId] = slot + 1
      scope.activeCalls += 1
      this.setActive(slot, true)
      encodeCall(buffer, offset, scope.id, moduleId, pluginNameId, call.info)
      encoded.push({ slot, sourceOffset: offset })
    }

    await this.storage.write(createWriteChunks(buffer, encoded))
  }

  async read(scopeName: string, pluginId: number): Promise<ViteInspectPluginCallInfo[]> {
    const scope = this.scopes.get(scopeName)
    if (!scope || scope.activeCalls === 0)
      return []

    const calls: ViteInspectPluginCallInfo[] = []
    for (let startSlot = 0; startSlot < this.slotCount; startSlot += READ_RECORDS_PER_CHUNK) {
      const count = Math.min(READ_RECORDS_PER_CHUNK, this.slotCount - startSlot)
      const buffer = await this.storage.read(startSlot, count)
      for (let index = 0; index < count; index++) {
        const slot = startSlot + index
        if (!this.isActive(slot))
          continue

        const offset = index * RECORD_SIZE
        if (buffer.readUInt32LE(offset + OFFSET_SCOPE_ID) !== scope.id)
          continue
        if (buffer.readUInt32LE(offset + OFFSET_PLUGIN_ID) !== pluginId)
          continue

        const moduleId = buffer.readUInt32LE(offset + OFFSET_MODULE_ID)
        const pluginNameId = buffer.readUInt32LE(offset + OFFSET_PLUGIN_NAME_ID)
        const type = decodeType(buffer.readUInt8(offset + OFFSET_TYPE))
        const flags = buffer.readUInt8(offset + OFFSET_FLAGS)
        const sequence = buffer.readDoubleLE(offset + OFFSET_SEQUENCE)
        const start = buffer.readDoubleLE(offset + OFFSET_START)
        const end = buffer.readDoubleLE(offset + OFFSET_END)
        calls.push({
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
        })
      }
      await yieldToEventLoop()
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

  async close(): Promise<void> {
    this.scopes.clear()
    this.activeChunks.length = 0
    this.nextSlotChunks.length = 0
    this.freeHead = 0
    await this.storage.close()
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
    }
    this.scopes.set(scopeName, scope)
    return scope
  }

  private allocateSlot(): number {
    if (this.freeHead > 0) {
      const slot = this.freeHead - 1
      this.freeHead = this.getNextSlot(slot)
      this.setNextSlot(slot, 0)
      return slot
    }
    const slot = this.slotCount++
    this.ensureSlotState(slot)
    return slot
  }

  private releaseModuleSlots(scope: ScopeState, moduleId: number): void {
    let head = scope.moduleHeads[moduleId] ?? 0
    scope.moduleHeads[moduleId] = 0
    while (head > 0) {
      const slot = head - 1
      const next = this.getNextSlot(slot)
      if (this.isActive(slot)) {
        this.setActive(slot, false)
        this.setNextSlot(slot, this.freeHead)
        this.freeHead = slot + 1
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
}

class FilePluginCallStorage implements PluginCallStorage {
  constructor(private readonly file: FileHandle) {}

  async write(chunks: WriteChunk[]): Promise<void> {
    await Promise.all(chunks.map(chunk => writeBuffer(
      this.file,
      chunk.buffer,
      chunk.startSlot * RECORD_SIZE,
    )))
  }

  async read(startSlot: number, count: number): Promise<Buffer> {
    const buffer = Buffer.allocUnsafe(count * RECORD_SIZE)
    let offset = 0
    while (offset < buffer.length) {
      const { bytesRead } = await this.file.read(
        buffer,
        offset,
        buffer.length - offset,
        startSlot * RECORD_SIZE + offset,
      )
      if (bytesRead === 0) {
        throw diagnostics.VDT0003({
          operation: 'reading the inspect plugin call archive',
        })
      }
      offset += bytesRead
    }
    return buffer
  }

  async close(): Promise<void> {
    await this.file.close()
  }
}

class MemoryPluginCallStorage implements PluginCallStorage {
  private buffer = Buffer.alloc(0)

  async write(chunks: WriteChunk[]): Promise<void> {
    const requiredBytes = chunks.reduce((size, chunk) => {
      return Math.max(size, chunk.startSlot * RECORD_SIZE + chunk.buffer.length)
    }, this.buffer.length)
    if (requiredBytes > this.buffer.length) {
      const next = Buffer.allocUnsafe(Math.max(requiredBytes, this.buffer.length * 2, RECORD_SIZE * 1024))
      this.buffer.copy(next)
      this.buffer = next
    }
    for (const chunk of chunks)
      chunk.buffer.copy(this.buffer, chunk.startSlot * RECORD_SIZE)
  }

  async read(startSlot: number, count: number): Promise<Buffer> {
    return this.buffer.subarray(
      startSlot * RECORD_SIZE,
      (startSlot + count) * RECORD_SIZE,
    )
  }

  async close(): Promise<void> {
    this.buffer = Buffer.alloc(0)
  }
}

function encodeCall(
  buffer: Buffer,
  offset: number,
  scopeId: number,
  moduleId: number,
  pluginNameId: number,
  info: ViteInspectPluginCallInfo,
): void {
  const sequence = callSequence(info.id)
  if (!Number.isSafeInteger(sequence) || sequence < 0 || info.plugin_id < 0 || info.plugin_id > 0xFFFF_FFFF) {
    throw diagnostics.VDT0003({
      operation: 'encoding an inspect plugin call',
    })
  }
  buffer.writeUInt32LE(scopeId, offset + OFFSET_SCOPE_ID)
  buffer.writeUInt32LE(moduleId, offset + OFFSET_MODULE_ID)
  buffer.writeUInt32LE(info.plugin_id, offset + OFFSET_PLUGIN_ID)
  buffer.writeUInt32LE(pluginNameId, offset + OFFSET_PLUGIN_NAME_ID)
  buffer.writeDoubleLE(sequence, offset + OFFSET_SEQUENCE)
  buffer.writeDoubleLE(info.timestamp_start, offset + OFFSET_START)
  buffer.writeDoubleLE(info.timestamp_end, offset + OFFSET_END)
  buffer.writeUInt8(encodeType(info.type), offset + OFFSET_TYPE)
  buffer.writeUInt8(
    info.unchanged == null
      ? 0
      : FLAG_HAS_UNCHANGED | (info.unchanged ? FLAG_UNCHANGED : 0),
    offset + OFFSET_FLAGS,
  )
  buffer.fill(0, offset + OFFSET_FLAGS + 1, offset + RECORD_SIZE)
}

function createWriteChunks(buffer: Buffer, calls: EncodedCall[]): WriteChunk[] {
  const ordered = calls.toSorted((a, b) => a.slot - b.slot)
  const chunks: WriteChunk[] = []
  let start = 0
  while (start < ordered.length) {
    let end = start + 1
    while (end < ordered.length && ordered[end]!.slot === ordered[end - 1]!.slot + 1)
      end += 1

    const firstSourceOffset = ordered[start]!.sourceOffset
    const chunk = hasContiguousSources(ordered, start, end, firstSourceOffset)
      ? buffer.subarray(firstSourceOffset, firstSourceOffset + (end - start) * RECORD_SIZE)
      : copyEncodedCalls(buffer, ordered, start, end)
    chunks.push({
      startSlot: ordered[start]!.slot,
      buffer: chunk,
    })
    start = end
  }
  return chunks
}

function hasContiguousSources(calls: EncodedCall[], start: number, end: number, firstOffset: number): boolean {
  for (let index = start; index < end; index++) {
    if (calls[index]!.sourceOffset !== firstOffset + (index - start) * RECORD_SIZE)
      return false
  }
  return true
}

function copyEncodedCalls(buffer: Buffer, calls: EncodedCall[], start: number, end: number): Buffer {
  const chunk = Buffer.allocUnsafe((end - start) * RECORD_SIZE)
  for (let index = start; index < end; index++) {
    buffer.copy(
      chunk,
      (index - start) * RECORD_SIZE,
      calls[index]!.sourceOffset,
      calls[index]!.sourceOffset + RECORD_SIZE,
    )
  }
  return chunk
}

async function writeBuffer(file: FileHandle, buffer: Buffer, position: number): Promise<void> {
  let offset = 0
  while (offset < buffer.length) {
    const { bytesWritten } = await file.write(
      buffer,
      offset,
      buffer.length - offset,
      position + offset,
    )
    if (bytesWritten === 0) {
      throw diagnostics.VDT0003({
        operation: 'writing the inspect plugin call archive',
      })
    }
    offset += bytesWritten
  }
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
