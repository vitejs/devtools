import type { DevToolsLogEntry, DevToolsLogEntryInput, DevToolsLogsHost as DevToolsLogsHostType, DevToolsNodeContext } from '@vitejs/devtools-kit'
import { createEventEmitter } from '@vitejs/devtools-kit/utils/events'
import { nanoid } from '@vitejs/devtools-kit/utils/nanoid'

const MAX_ENTRIES = 1000

export class DevToolsLogsHost implements DevToolsLogsHostType {
  public readonly entries: DevToolsLogsHostType['entries'] = new Map()
  public readonly events: DevToolsLogsHostType['events'] = createEventEmitter()

  /** Tracks when each entry was last added or updated (monotonic) */
  readonly lastModified = new Map<string, number>()
  /** Tracks recently removed entry IDs with their removal time */
  readonly removals: Array<{ id: string, time: number }> = []

  private _autoDeleteTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private _clock = 0

  private _tick(): number {
    return ++this._clock
  }

  constructor(
    public readonly context: DevToolsNodeContext,
  ) {}

  add(input: DevToolsLogEntryInput): DevToolsLogEntry {
    // Dedup: if an entry with the same explicit id exists, update it instead
    if (input.id && this.entries.has(input.id)) {
      return this.update(input.id, input)!
    }

    const entry: DevToolsLogEntry = {
      ...input,
      id: input.id ?? nanoid(),
      timestamp: input.timestamp ?? Date.now(),
      source: (input as any).source ?? 'server',
    }

    // FIFO eviction when at capacity
    if (this.entries.size >= MAX_ENTRIES) {
      const oldest = this.entries.keys().next().value!
      this.remove(oldest)
    }

    this.entries.set(entry.id, entry)
    this.lastModified.set(entry.id, this._tick())
    this.events.emit('log:added', entry)

    if (entry.autoDelete) {
      this._autoDeleteTimers.set(entry.id, setTimeout(() => {
        this.remove(entry.id)
      }, entry.autoDelete))
    }

    return entry
  }

  update(id: string, patch: Partial<DevToolsLogEntryInput>): DevToolsLogEntry | undefined {
    const existing = this.entries.get(id)
    if (!existing)
      return undefined

    const updated: DevToolsLogEntry = {
      ...existing,
      ...patch,
      id: existing.id,
      source: existing.source,
      timestamp: existing.timestamp,
    }

    this.entries.set(id, updated)
    this.lastModified.set(id, this._tick())
    this.events.emit('log:updated', updated)

    // Reset autoDelete timer if changed
    if (patch.autoDelete !== undefined) {
      const timer = this._autoDeleteTimers.get(id)
      if (timer) {
        clearTimeout(timer)
        this._autoDeleteTimers.delete(id)
      }
      if (patch.autoDelete) {
        this._autoDeleteTimers.set(id, setTimeout(() => {
          this.remove(id)
        }, patch.autoDelete))
      }
    }

    return updated
  }

  remove(id: string): void {
    const timer = this._autoDeleteTimers.get(id)
    if (timer) {
      clearTimeout(timer)
      this._autoDeleteTimers.delete(id)
    }
    this.entries.delete(id)
    this.lastModified.delete(id)
    this.removals.push({ id, time: this._tick() })
    this.events.emit('log:removed', id)
  }

  clear(): void {
    for (const timer of this._autoDeleteTimers.values())
      clearTimeout(timer)
    this._autoDeleteTimers.clear()
    const tick = this._tick()
    for (const id of this.entries.keys())
      this.removals.push({ id, time: tick })
    this.entries.clear()
    this.lastModified.clear()
    this.events.emit('log:cleared')
  }
}
