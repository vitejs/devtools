import type { DevToolsLogEntry, DevToolsLogEntryInput, DevToolsLogsHost as DevToolsLogsHostType, DevToolsNodeContext } from '@vitejs/devtools-kit'
import { createEventEmitter } from '@vitejs/devtools-kit/utils/events'
import { nanoid } from '@vitejs/devtools-kit/utils/nanoid'

const MAX_ENTRIES = 1000

export class DevToolsLogsHost implements DevToolsLogsHostType {
  public readonly entries: DevToolsLogsHostType['entries'] = new Map()
  public readonly events: DevToolsLogsHostType['events'] = createEventEmitter()

  private _autoDeleteTimers = new Map<string, ReturnType<typeof setTimeout>>()

  constructor(
    public readonly context: DevToolsNodeContext,
  ) {}

  add(input: DevToolsLogEntryInput): DevToolsLogEntry {
    const entry: DevToolsLogEntry = {
      ...input,
      id: input.id ?? nanoid(),
      timestamp: input.timestamp ?? Date.now(),
      source: (input as any).source ?? 'unknown',
    }

    // FIFO eviction when at capacity
    if (this.entries.size >= MAX_ENTRIES) {
      const oldest = this.entries.keys().next().value!
      this.remove(oldest)
    }

    this.entries.set(entry.id, entry)
    this.events.emit('log:added', entry)

    if (entry.autoDelete) {
      this._autoDeleteTimers.set(entry.id, setTimeout(() => {
        this.remove(entry.id)
      }, entry.autoDelete))
    }

    return entry
  }

  remove(id: string): void {
    const timer = this._autoDeleteTimers.get(id)
    if (timer) {
      clearTimeout(timer)
      this._autoDeleteTimers.delete(id)
    }
    this.entries.delete(id)
    this.events.emit('log:removed', id)
  }

  clear(): void {
    for (const timer of this._autoDeleteTimers.values())
      clearTimeout(timer)
    this._autoDeleteTimers.clear()
    this.entries.clear()
    this.events.emit('log:cleared')
  }
}
