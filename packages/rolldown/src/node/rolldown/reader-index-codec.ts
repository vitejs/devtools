import type { IndexedHookCall, LineLocation, ModuleEventIndex, PendingHookCallStart } from './log-cache'
import { Buffer } from 'node:buffer'

// Binary encoding of the reader index. Large logs have millions of index entries, and a JSON
// round trip of that size blocks the event loop for hundreds of milliseconds. Encoding and
// decoding here both yield regularly, so the DevTools server keeps answering meanwhile.

export interface ReaderIndex {
  lastBytes: number
  lastTimestamp: number
  moduleEventIndex: Map<string, ModuleEventIndex>
  stringRefIndex: Map<string, LineLocation>
  pendingHookCallStarts: Map<string, PendingHookCallStart>
  assetsReadyLocations: LineLocation[]
}

export interface ReaderIndexLogStat {
  size: number
  mtime: number
}

const MAGIC = 0x58494452 // "RDIX"
export const READER_INDEX_CODEC_VERSION = 1
const SLICE_MS = 8
const CHUNK_BYTES = 4 * 1024 * 1024
const HOOK_KINDS = ['resolveIds', 'loads', 'transforms'] as const

function createYielder() {
  let sliceStart = performance.now()
  return async () => {
    if (performance.now() - sliceStart <= SLICE_MS)
      return
    await new Promise(resolve => setImmediate(resolve))
    sliceStart = performance.now()
  }
}

class Writer {
  readonly chunks: Buffer[] = []
  private buffer = Buffer.allocUnsafe(CHUNK_BYTES)
  private offset = 0

  private reserve(bytes: number) {
    if (this.offset + bytes <= this.buffer.length)
      return
    this.chunks.push(this.buffer.subarray(0, this.offset))
    this.buffer = Buffer.allocUnsafe(Math.max(CHUNK_BYTES, bytes))
    this.offset = 0
  }

  u8(value: number) {
    this.reserve(1)
    this.offset = this.buffer.writeUInt8(value, this.offset)
  }

  u32(value: number) {
    this.reserve(4)
    this.offset = this.buffer.writeUInt32LE(value, this.offset)
  }

  f64(value: number) {
    this.reserve(8)
    this.offset = this.buffer.writeDoubleLE(value, this.offset)
  }

  string(value: string) {
    const length = Buffer.byteLength(value)
    this.u32(length)
    this.reserve(length)
    this.offset += this.buffer.write(value, this.offset, length, 'utf8')
  }

  location(value: LineLocation) {
    this.f64(value.offset)
    this.f64(value.length)
  }

  finish(): Buffer[] {
    this.chunks.push(this.buffer.subarray(0, this.offset))
    return this.chunks
  }
}

class Reader {
  private offset = 0

  constructor(private readonly buffer: Buffer) {}

  private check(bytes: number) {
    if (this.offset + bytes > this.buffer.length)
      throw new RangeError('Truncated reader index cache')
  }

  u8() {
    this.check(1)
    return this.buffer.readUInt8(this.offset++)
  }

  u32() {
    this.check(4)
    const value = this.buffer.readUInt32LE(this.offset)
    this.offset += 4
    return value
  }

  f64() {
    this.check(8)
    const value = this.buffer.readDoubleLE(this.offset)
    this.offset += 8
    return value
  }

  string() {
    const length = this.u32()
    this.check(length)
    const value = this.buffer.toString('utf8', this.offset, this.offset + length)
    this.offset += length
    return value
  }

  location(): LineLocation {
    return { offset: this.f64(), length: this.f64() }
  }

  get done() {
    return this.offset === this.buffer.length
  }
}

export async function encodeReaderIndex(index: ReaderIndex, stat: ReaderIndexLogStat): Promise<Buffer[]> {
  const writer = new Writer()
  const pause = createYielder()
  writer.u32(MAGIC)
  writer.u32(READER_INDEX_CODEC_VERSION)
  writer.f64(stat.size)
  writer.f64(stat.mtime)
  writer.f64(index.lastBytes)
  writer.f64(index.lastTimestamp)

  writer.u32(index.moduleEventIndex.size)
  for (const [module, events] of index.moduleEventIndex) {
    writer.string(module)
    for (const kind of HOOK_KINDS) {
      writer.u32(events[kind].size)
      for (const [id, call] of events[kind]) {
        writer.string(id)
        writer.location(call.start)
        writer.location(call.end)
      }
    }
    await pause()
  }

  writer.u32(index.stringRefIndex.size)
  for (const [id, location] of index.stringRefIndex) {
    writer.string(id)
    writer.location(location)
    await pause()
  }

  writer.u32(index.pendingHookCallStarts.size)
  for (const [id, start] of index.pendingHookCallStarts) {
    writer.string(id)
    writer.u8(start.module == null ? 0 : 1)
    if (start.module != null)
      writer.string(start.module)
    writer.location(start.location)
  }

  writer.u32(index.assetsReadyLocations.length)
  for (const location of index.assetsReadyLocations)
    writer.location(location)

  return writer.finish()
}

/** Returns `undefined` when the buffer isn't a valid index for this log version. */
export async function decodeReaderIndex(buffer: Buffer, stat: ReaderIndexLogStat): Promise<ReaderIndex | undefined> {
  try {
    const reader = new Reader(buffer)
    const pause = createYielder()
    if (reader.u32() !== MAGIC || reader.u32() !== READER_INDEX_CODEC_VERSION)
      return undefined
    if (reader.f64() !== stat.size || reader.f64() !== stat.mtime)
      return undefined

    const lastBytes = reader.f64()
    const lastTimestamp = reader.f64()

    const moduleEventIndex = new Map<string, ModuleEventIndex>()
    for (let count = reader.u32(); count > 0; count--) {
      const module = reader.string()
      const events = {} as ModuleEventIndex
      for (const kind of HOOK_KINDS) {
        const calls = new Map<string, IndexedHookCall>()
        for (let remaining = reader.u32(); remaining > 0; remaining--)
          calls.set(reader.string(), { start: reader.location(), end: reader.location() })
        events[kind] = calls
      }
      moduleEventIndex.set(module, events)
      await pause()
    }

    const stringRefIndex = new Map<string, LineLocation>()
    for (let count = reader.u32(); count > 0; count--) {
      stringRefIndex.set(reader.string(), reader.location())
      await pause()
    }

    const pendingHookCallStarts = new Map<string, PendingHookCallStart>()
    for (let count = reader.u32(); count > 0; count--) {
      const id = reader.string()
      const module = reader.u8() ? reader.string() : undefined
      pendingHookCallStarts.set(id, module == null ? { location: reader.location() } : { module, location: reader.location() })
    }

    const assetsReadyLocations: LineLocation[] = []
    for (let count = reader.u32(); count > 0; count--)
      assetsReadyLocations.push(reader.location())

    if (!reader.done)
      return undefined
    return { lastBytes, lastTimestamp, moduleEventIndex, stringRefIndex, pendingHookCallStarts, assetsReadyLocations }
  }
  catch {
    return undefined
  }
}
