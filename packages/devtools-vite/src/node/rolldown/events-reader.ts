import type { Event, SessionMeta } from '@rolldown/debug'
import fs from 'node:fs'
import { parseJsonStreamWithConcatArrays } from '../utils/json-parse-stream'
import { RolldownEventsManager } from './events-manager'

const readers: Map<string, RolldownEventsReader> = new Map()

export class RolldownEventsReader {
  lastBytes: number = 0
  lastTimestamp: number = 0
  manager = new RolldownEventsManager()
  meta: SessionMeta | undefined

  private constructor(
    readonly filepath: string,
  ) {
  }

  static get(filepath: string) {
    if (readers.has(filepath)) {
      return readers.get(filepath)!
    }
    const reader = new RolldownEventsReader(filepath)
    readers.set(filepath, reader)
    return reader
  }

  async read() {
    const { mtime, size } = await fs.promises.stat(this.filepath)
    if (mtime.getTime() <= this.lastTimestamp) {
      return
    }
    const stream = fs.createReadStream(this.filepath, {
      start: this.lastBytes,
    })
    this.lastTimestamp = mtime.getTime()
    this.lastBytes = size
    await parseJsonStreamWithConcatArrays<Event>(
      stream,
      (event) => {
        this.manager.handleEvent(event)
        return event
      },
    )
  }

  dispose() {
    readers.delete(this.filepath)
    this.manager.dispose()
  }

  [Symbol.dispose]() {
    this.dispose()
  }
}
