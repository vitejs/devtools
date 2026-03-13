import type { EventEmitter } from './events'

export type DevToolsLogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug'
export type DevToolsLogEntryFrom = 'server' | 'browser'

export interface DevToolsLogElementPosition {
  /** CSS selector for the element */
  selector?: string
  /** Bounding box of the element */
  boundingBox?: { x: number, y: number, width: number, height: number }
  /** Human-readable description of the element */
  description?: string
}

export interface DevToolsLogFilePosition {
  /** Absolute or relative file path */
  file: string
  /** Line number (1-based) */
  line?: number
  /** Column number (1-based) */
  column?: number
}

export interface DevToolsLogEntry {
  /**
   * Unique identifier for this log entry (auto-generated if not provided)
   */
  id: string
  /**
   * Short title or summary of the log
   */
  message: string
  /**
   * Optional detailed description or explanation
   */
  description?: string
  /**
   * Severity level, determines color and icon
   */
  level: DevToolsLogLevel
  /**
   * Optional stack trace string
   */
  stacktrace?: string
  /**
   * Optional DOM element position info (e.g., for a11y issues)
   */
  elementPosition?: DevToolsLogElementPosition
  /**
   * Optional source file position info (e.g., for lint errors)
   */
  filePosition?: DevToolsLogFilePosition
  /**
   * Whether this log should also appear as a toast notification
   */
  notify?: boolean
  /**
   * Origin of the log entry, automatically set by the context
   */
  from: DevToolsLogEntryFrom
  /**
   * Grouping category (e.g., 'a11y', 'lint', 'runtime', 'test')
   */
  category?: string
  /**
   * Optional tags/labels for filtering
   */
  labels?: string[]
  /**
   * Time in ms to auto-dismiss the toast notification (client-side)
   */
  autoDismiss?: number
  /**
   * Time in ms to auto-delete this log entry (server-side)
   */
  autoDelete?: number
  /**
   * Timestamp when the log was created (auto-generated if not provided)
   */
  timestamp: number
  /**
   * Status of the log entry (e.g., 'loading' while an operation is in progress).
   * Defaults to 'idle' when not specified.
   */
  status?: 'loading' | 'idle'
}

/**
 * Input type for creating a log entry.
 * `id`, `timestamp`, and `source` are auto-filled by the host.
 */
export type DevToolsLogEntryInput = Omit<DevToolsLogEntry, 'id' | 'timestamp' | 'from'> & {
  id?: string
  timestamp?: number
}

export interface DevToolsLogHandle {
  /** The underlying log entry data */
  readonly entry: DevToolsLogEntry
  /** Shortcut to entry.id */
  readonly id: string
  /** Partial update of this log entry */
  update: (patch: Partial<DevToolsLogEntryInput>) => Promise<DevToolsLogEntry | undefined>
  /** Remove this log entry */
  dismiss: () => Promise<void>
}

export interface DevToolsLogsClient {
  /**
   * Add a log entry. Returns a Promise resolving to a handle for subsequent updates/dismissal.
   * Can be used without `await` for fire-and-forget usage.
   */
  add: (input: DevToolsLogEntryInput) => Promise<DevToolsLogHandle>
  /** Remove a log entry by id */
  remove: (id: string) => Promise<void>
  /** Clear all log entries */
  clear: () => Promise<void>
}

export interface DevToolsLogsHost {
  readonly entries: Map<string, DevToolsLogEntry>
  readonly events: EventEmitter<{
    'log:added': (entry: DevToolsLogEntry) => void
    'log:updated': (entry: DevToolsLogEntry) => void
    'log:removed': (id: string) => void
    'log:cleared': () => void
  }>

  /**
   * Add a new log entry. If an entry with the same `id` already exists, it will be updated instead.
   * Returns a handle for subsequent updates/dismissal. Can be used without `await` for fire-and-forget.
   */
  add: (entry: DevToolsLogEntryInput) => Promise<DevToolsLogHandle>
  /**
   * Update an existing log entry by id (partial update)
   */
  update: (id: string, patch: Partial<DevToolsLogEntryInput>) => Promise<DevToolsLogEntry | undefined>
  /**
   * Remove a log entry by id
   */
  remove: (id: string) => Promise<void>
  /**
   * Clear all log entries
   */
  clear: () => Promise<void>
}
