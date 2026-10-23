import type { FileHandle } from 'node:fs/promises'
import type { ViteInspectPayloadRange } from './types'
import { Buffer } from 'node:buffer'
import { open } from 'node:fs/promises'
import { diagnostics } from '../../diagnostics'

// Lengths are below 2^53, so their log2 bucket never exceeds this.
const MAX_SIZE_BUCKET = 53

export interface InspectPayloadStore {
  write: (values: Array<string | null | undefined>) => Promise<Array<ViteInspectPayloadRange | undefined>>
  read: (range: ViteInspectPayloadRange) => Promise<string>
  reclaim: (ranges: ViteInspectPayloadRange[]) => void
  close: () => Promise<void>
}

export async function createInspectPayloadStore(filename?: string): Promise<InspectPayloadStore> {
  if (!filename)
    return new MemoryInspectPayloadStore()
  return new FileInspectPayloadStore(await open(filename, 'w+'))
}

class MemoryInspectPayloadStore implements InspectPayloadStore {
  private readonly values = new Map<number, string>()
  private nextOffset = 0

  async write(values: Array<string | null | undefined>): Promise<Array<ViteInspectPayloadRange | undefined>> {
    return values.map((value) => {
      if (value == null)
        return undefined
      const offset = this.nextOffset
      const length = Buffer.byteLength(value)
      this.nextOffset += Math.max(length, 1)
      this.values.set(offset, value)
      return { offset, length }
    })
  }

  async read(range: ViteInspectPayloadRange): Promise<string> {
    const value = this.values.get(range.offset)
    if (value == null) {
      throw diagnostics.VDT0003({
        operation: 'reading an in-memory inspect payload',
      })
    }
    return value
  }

  reclaim(ranges: ViteInspectPayloadRange[]): void {
    for (const range of ranges)
      this.values.delete(range.offset)
  }

  async close(): Promise<void> {
    this.values.clear()
  }
}

class FileInspectPayloadStore implements InspectPayloadStore {
  private nextOffset = 0
  // Free ranges sorted by offset, plus the same ranges bucketed by size so allocation doesn't scan them all.
  private freeRanges: ViteInspectPayloadRange[] = []
  private readonly freeRangesBySize = new Map<number, Set<ViteInspectPayloadRange>>()
  // Payloads keyed by offset once the archive file can no longer be written.
  private fallback?: Map<number, Buffer>

  constructor(private readonly file: FileHandle) {}

  async write(values: Array<string | null | undefined>): Promise<Array<ViteInspectPayloadRange | undefined>> {
    const ranges: Array<ViteInspectPayloadRange | undefined> = []
    const writes: Array<{
      buffer: Buffer
      range: ViteInspectPayloadRange
    }> = []

    for (const value of values) {
      if (value == null) {
        ranges.push(undefined)
        continue
      }
      const buffer = Buffer.from(value)
      const range = this.allocate(buffer.length)
      ranges.push(range)
      if (buffer.length > 0)
        writes.push({ buffer, range })
    }

    if (!this.fallback) {
      try {
        await this.writeAllocatedPayloads(writes)
        return ranges
      }
      catch (error) {
        // Transform data can't be reproduced, so keep it in memory instead of dropping it.
        this.fallback = new Map()
        diagnostics.VDT0004({ archive: 'payload', cause: error instanceof Error ? error : new Error(String(error)) })
      }
    }
    for (const { buffer, range } of writes)
      this.fallback.set(range.offset, buffer)
    return ranges
  }

  async read(range: ViteInspectPayloadRange): Promise<string> {
    if (range.length === 0)
      return ''

    const fallback = this.fallback?.get(range.offset)
    if (fallback?.length === range.length)
      return fallback.toString()

    const buffer = Buffer.allocUnsafe(range.length)
    let readOffset = 0
    while (readOffset < buffer.length) {
      const { bytesRead } = await this.file.read(
        buffer,
        readOffset,
        buffer.length - readOffset,
        range.offset + readOffset,
      )
      if (bytesRead === 0) {
        throw diagnostics.VDT0003({
          operation: 'reading the inspect payload archive',
        })
      }
      readOffset += bytesRead
    }
    return buffer.toString()
  }

  async close(): Promise<void> {
    this.freeRanges.length = 0
    this.freeRangesBySize.clear()
    this.fallback?.clear()
    await this.file.close()
  }

  reclaim(ranges: ViteInspectPayloadRange[]): void {
    for (const range of ranges)
      this.fallback?.delete(range.offset)
    for (const range of ranges) {
      if (range.length > 0)
        this.insertFreeRange(range.offset, range.length)
    }
  }

  private allocate(length: number): ViteInspectPayloadRange {
    if (length === 0)
      return { offset: this.nextOffset, length }

    // Best fit: the smallest free range that is large enough, the lowest offset among equal sizes.
    let best: ViteInspectPayloadRange | undefined
    for (let bucket = sizeBucket(length); bucket <= MAX_SIZE_BUCKET; bucket++) {
      for (const range of this.freeRangesBySize.get(bucket) ?? []) {
        if (range.length < length)
          continue
        if (!best || range.length < best.length || (range.length === best.length && range.offset < best.offset))
          best = range
      }
      // Every range in a higher bucket is larger than any range in this one.
      if (best)
        break
    }

    if (best) {
      const allocated = { offset: best.offset, length }
      this.removeFromSizeBucket(best)
      if (best.length === length) {
        this.freeRanges.splice(this.findFreeRangeIndex(best.offset), 1)
      }
      else {
        best.offset += length
        best.length -= length
        this.addToSizeBucket(best)
      }
      return allocated
    }

    const allocated = { offset: this.nextOffset, length }
    this.nextOffset += length
    return allocated
  }

  private insertFreeRange(offset: number, length: number): void {
    let end = offset + length
    let index = this.findFreeRangeIndex(offset)
    let start = offset
    // Merge with the previous range when it touches or overlaps this one.
    const previous = this.freeRanges[index - 1]
    if (previous && previous.offset + previous.length >= start) {
      index -= 1
      start = previous.offset
      end = Math.max(end, previous.offset + previous.length)
    }
    // Merge every following range that starts before this one ends.
    let removeCount = 0
    while (index + removeCount < this.freeRanges.length && this.freeRanges[index + removeCount]!.offset <= end) {
      const next = this.freeRanges[index + removeCount]!
      end = Math.max(end, next.offset + next.length)
      removeCount += 1
    }
    for (let i = index; i < index + removeCount; i++)
      this.removeFromSizeBucket(this.freeRanges[i]!)
    const merged = { offset: start, length: end - start }
    this.freeRanges.splice(index, removeCount, merged)
    this.addToSizeBucket(merged)
  }

  // Index of the first free range whose offset is not below `offset`.
  private findFreeRangeIndex(offset: number): number {
    let low = 0
    let high = this.freeRanges.length
    while (low < high) {
      const middle = (low + high) >>> 1
      if (this.freeRanges[middle]!.offset < offset)
        low = middle + 1
      else
        high = middle
    }
    return low
  }

  private addToSizeBucket(range: ViteInspectPayloadRange): void {
    const bucket = sizeBucket(range.length)
    let ranges = this.freeRangesBySize.get(bucket)
    if (!ranges) {
      ranges = new Set()
      this.freeRangesBySize.set(bucket, ranges)
    }
    ranges.add(range)
  }

  private removeFromSizeBucket(range: ViteInspectPayloadRange): void {
    const bucket = sizeBucket(range.length)
    const ranges = this.freeRangesBySize.get(bucket)
    ranges?.delete(range)
    if (ranges?.size === 0)
      this.freeRangesBySize.delete(bucket)
  }

  private async writeAllocatedPayloads(
    writes: Array<{ buffer: Buffer, range: ViteInspectPayloadRange }>,
  ): Promise<void> {
    const ordered = writes.toSorted((a, b) => a.range.offset - b.range.offset)
    let buffers: Buffer[] = []
    let startOffset = 0
    let endOffset = 0

    for (const write of ordered) {
      if (buffers.length > 0 && write.range.offset !== endOffset) {
        await this.writeBuffers(buffers, startOffset)
        buffers = []
      }
      if (buffers.length === 0)
        startOffset = write.range.offset
      buffers.push(write.buffer)
      endOffset = write.range.offset + write.range.length
    }
    if (buffers.length > 0)
      await this.writeBuffers(buffers, startOffset)
  }

  private async writeBuffers(input: Buffer[], startOffset: number): Promise<void> {
    let buffers = input
    let offset = startOffset
    while (buffers.length > 0) {
      const { bytesWritten } = await this.file.writev(buffers, offset)
      if (bytesWritten === 0) {
        throw diagnostics.VDT0003({
          operation: 'writing the inspect payload archive',
        })
      }
      buffers = consumeBuffers(buffers, bytesWritten)
      offset += bytesWritten
    }
  }
}

function sizeBucket(length: number): number {
  return Math.floor(Math.log2(length))
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
