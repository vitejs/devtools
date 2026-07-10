import type { FileHandle } from 'node:fs/promises'
import type { ViteInspectPayloadRange } from './types'
import { Buffer } from 'node:buffer'
import { open } from 'node:fs/promises'
import { diagnostics } from '../../diagnostics'

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
  private freeRanges: ViteInspectPayloadRange[] = []

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
    await this.writeAllocatedPayloads(writes)
    return ranges
  }

  async read(range: ViteInspectPayloadRange): Promise<string> {
    if (range.length === 0)
      return ''

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
    await this.file.close()
  }

  reclaim(ranges: ViteInspectPayloadRange[]): void {
    this.freeRanges.push(...ranges.filter(range => range.length > 0))
    this.mergeFreeRanges()
  }

  private allocate(length: number): ViteInspectPayloadRange {
    if (length === 0)
      return { offset: this.nextOffset, length }

    let bestIndex = -1
    for (let index = 0; index < this.freeRanges.length; index++) {
      const range = this.freeRanges[index]!
      if (range.length < length)
        continue
      if (bestIndex < 0 || range.length < this.freeRanges[bestIndex]!.length)
        bestIndex = index
    }

    if (bestIndex >= 0) {
      const range = this.freeRanges[bestIndex]!
      const allocated = { offset: range.offset, length }
      if (range.length === length) {
        this.freeRanges.splice(bestIndex, 1)
      }
      else {
        range.offset += length
        range.length -= length
      }
      return allocated
    }

    const allocated = { offset: this.nextOffset, length }
    this.nextOffset += length
    return allocated
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

  private mergeFreeRanges(): void {
    this.freeRanges.sort((a, b) => a.offset - b.offset)
    const merged: ViteInspectPayloadRange[] = []
    for (const range of this.freeRanges) {
      const previous = merged.at(-1)
      if (!previous || range.offset > previous.offset + previous.length) {
        merged.push({ ...range })
        continue
      }
      previous.length = Math.max(
        previous.length,
        range.offset + range.length - previous.offset,
      )
    }
    this.freeRanges = merged
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
