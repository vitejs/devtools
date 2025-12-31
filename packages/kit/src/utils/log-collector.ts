/**
 * Log Collector
 *
 * Collects and stores log entries for display in the DevTools Logs panel.
 * Supports filtering, subscribing to updates, and auto-pruning old entries.
 */

import type { LogCollector, LogEntry, LogFilter, LogLevel } from './logger-types'

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
}

export interface LogCollectorOptions {
  /** Maximum number of entries to keep. Default: 1000 */
  maxEntries?: number
}

export function createLogCollector(options: LogCollectorOptions = {}): LogCollector {
  const { maxEntries = 1000 } = options

  const entries: LogEntry[] = []
  const subscribers = new Set<(entries: readonly LogEntry[]) => void>()

  function notify(): void {
    const snapshot = [...entries] as readonly LogEntry[]
    subscribers.forEach(cb => cb(snapshot))
  }

  const collector: LogCollector = {
    get entries(): readonly LogEntry[] {
      return entries
    },

    maxEntries,

    add(entry: LogEntry): void {
      entries.push(entry)

      // Prune old entries if over limit
      while (entries.length > maxEntries) {
        entries.shift()
      }

      notify()
    },

    clear(): void {
      entries.length = 0
      notify()
    },

    getEntries(filter?: LogFilter): LogEntry[] {
      if (!filter) {
        return [...entries]
      }

      return entries.filter((entry) => {
        // Filter by level (entry level must be >= filter level)
        if (filter.level) {
          const filterPriority = LOG_LEVEL_PRIORITY[filter.level]
          const entryPriority = LOG_LEVEL_PRIORITY[entry.level]
          if (entryPriority < filterPriority) {
            return false
          }
        }

        // Filter by scope (partial match)
        if (filter.scope && entry.scope) {
          if (!entry.scope.includes(filter.scope)) {
            return false
          }
        }

        // Filter by timestamp
        if (filter.since && entry.timestamp < filter.since) {
          return false
        }

        return true
      })
    },

    subscribe(callback: (entries: readonly LogEntry[]) => void): () => void {
      subscribers.add(callback)

      // Immediately call with current entries
      callback([...entries] as readonly LogEntry[])

      // Return unsubscribe function
      return () => {
        subscribers.delete(callback)
      }
    },
  }

  return collector
}
