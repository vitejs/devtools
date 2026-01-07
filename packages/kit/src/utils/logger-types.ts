/**
 * Logger Types
 *
 * Shared type definitions for the unified logging API.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

export interface LogEntry {
  /** Log level */
  level: LogLevel
  /** Log message */
  message: string
  /** Unix timestamp in milliseconds */
  timestamp: number
  /** Logger scope/namespace (e.g., 'rpc', 'ws', 'client') */
  scope?: string
  /** Additional structured metadata */
  meta?: Record<string, unknown>
  /** Error object if this is an error log */
  error?: Error
}

export interface LoggerOptions {
  /** Minimum log level to output. Default: 'info' */
  level?: LogLevel
  /** Scope/namespace for the logger (e.g., 'rpc', 'ws', 'client') */
  scope?: string
  /** Whether to include timestamps in output. Default: false */
  timestamps?: boolean
  /** Custom log handler for aggregation/forwarding */
  onLog?: (entry: LogEntry) => void
}

export interface Logger {
  /** Log debug message (development only) */
  debug: (message: string, meta?: Record<string, unknown>) => void
  /** Log info message */
  info: (message: string, meta?: Record<string, unknown>) => void
  /** Log warning message */
  warn: (message: string, meta?: Record<string, unknown>) => void
  /** Log error message or Error object */
  error: (message: string | Error, meta?: Record<string, unknown>) => void

  /** Create a child logger with a sub-scope */
  child: (scope: string) => Logger

  /** Update logger level at runtime */
  setLevel: (level: LogLevel) => void

  /** Get current log level */
  getLevel: () => LogLevel
}

export interface LogCollector {
  /** All collected log entries */
  readonly entries: readonly LogEntry[]
  /** Maximum number of entries to keep */
  readonly maxEntries: number

  /** Add a log entry */
  add: (entry: LogEntry) => void
  /** Clear all entries */
  clear: () => void
  /** Get filtered entries */
  getEntries: (filter?: LogFilter) => LogEntry[]

  /** Subscribe to log updates */
  subscribe: (callback: (entries: readonly LogEntry[]) => void) => () => void
}

export interface LogFilter {
  /** Filter by log level */
  level?: LogLevel
  /** Filter by scope (partial match) */
  scope?: string
  /** Filter entries after this timestamp */
  since?: number
}
