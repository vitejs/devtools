import type { EventEmitter } from 'devframe/types'

export type DevToolsMessageLevel = 'info' | 'warn' | 'error' | 'success' | 'debug'
export type DevToolsMessageEntryFrom = 'server' | 'browser'

export interface DevToolsMessageElementPosition {
  /** CSS selector for the element */
  selector?: string
  /** Bounding box of the element */
  boundingBox?: { x: number, y: number, width: number, height: number }
  /** Human-readable description of the element */
  description?: string
}

export interface DevToolsMessageFilePosition {
  /** Absolute or relative file path */
  file: string
  /** Line number (1-based) */
  line?: number
  /** Column number (1-based) */
  column?: number
}

export interface DevToolsMessageEntry {
  /**
   * Unique identifier for this message entry (auto-generated if not provided)
   */
  id: string
  /**
   * Short title or summary of the message
   */
  message: string
  /**
   * Optional detailed description or explanation
   */
  description?: string
  /**
   * Severity level, determines color and icon
   */
  level: DevToolsMessageLevel
  /**
   * Optional stack trace string
   */
  stacktrace?: string
  /**
   * Optional DOM element position info (e.g., for a11y issues)
   */
  elementPosition?: DevToolsMessageElementPosition
  /**
   * Optional source file position info (e.g., for lint errors)
   */
  filePosition?: DevToolsMessageFilePosition
  /**
   * Whether this message should also appear as a toast notification
   */
  notify?: boolean
  /**
   * Origin of the message entry, automatically set by the context
   */
  from: DevToolsMessageEntryFrom
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
   * Time in ms to auto-delete this message entry (server-side)
   */
  autoDelete?: number
  /**
   * Timestamp when the message was created (auto-generated if not provided)
   */
  timestamp: number
  /**
   * Status of the message entry (e.g., 'loading' while an operation is in progress).
   * Defaults to 'idle' when not specified.
   */
  status?: 'loading' | 'idle'
}

/**
 * Input type for creating a message entry.
 * `id`, `timestamp`, and `from` are auto-filled by the host.
 */
export type DevToolsMessageEntryInput = Omit<DevToolsMessageEntry, 'id' | 'timestamp' | 'from'> & {
  id?: string
  timestamp?: number
}

export interface DevToolsMessageHandle {
  /** The underlying message entry data */
  readonly entry: DevToolsMessageEntry
  /** Shortcut to entry.id */
  readonly id: string
  /** Partial update of this message entry */
  update: (patch: Partial<DevToolsMessageEntryInput>) => Promise<DevToolsMessageEntry | undefined>
  /** Remove this message entry */
  dismiss: () => Promise<void>
}

export interface DevToolsMessagesClient {
  /**
   * Add a message entry. Returns a Promise resolving to a handle for subsequent updates/dismissal.
   * Can be used without `await` for fire-and-forget usage.
   */
  add: (input: DevToolsMessageEntryInput) => Promise<DevToolsMessageHandle>
  /** Remove a message entry by id */
  remove: (id: string) => Promise<void>
  /** Clear all message entries */
  clear: () => Promise<void>
}

export interface DevToolsMessagesHost {
  readonly entries: Map<string, DevToolsMessageEntry>
  readonly events: EventEmitter<{
    'message:added': (entry: DevToolsMessageEntry) => void
    'message:updated': (entry: DevToolsMessageEntry) => void
    'message:removed': (id: string) => void
    'message:cleared': () => void
  }>

  /**
   * Add a new message entry. If an entry with the same `id` already exists, it will be updated instead.
   * Returns a handle for subsequent updates/dismissal. Can be used without `await` for fire-and-forget.
   */
  add: (entry: DevToolsMessageEntryInput) => Promise<DevToolsMessageHandle>
  /**
   * Update an existing message entry by id (partial update)
   */
  update: (id: string, patch: Partial<DevToolsMessageEntryInput>) => Promise<DevToolsMessageEntry | undefined>
  /**
   * Remove a message entry by id
   */
  remove: (id: string) => Promise<void>
  /**
   * Clear all message entries
   */
  clear: () => Promise<void>
}
