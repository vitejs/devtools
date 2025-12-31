/**
 * Logger Implementation for Node.js
 *
 * A lightweight, scoped logger for server-side Vite DevTools code.
 * Supports colored output, log levels, and log aggregation.
 */

import type { LogEntry, Logger, LoggerOptions, LogLevel } from './logger-types'
import process from 'node:process'

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
}

// ANSI color codes for terminal output
const COLORS = {
  reset: '\x1B[0m',
  gray: '\x1B[90m',
  cyan: '\x1B[36m',
  blue: '\x1B[34m',
  yellow: '\x1B[33m',
  red: '\x1B[31m',
  bold: '\x1B[1m',
} as const

const LEVEL_CONFIG: Record<Exclude<LogLevel, 'silent'>, { icon: string, color: string }> = {
  debug: { icon: '🔍', color: COLORS.gray },
  info: { icon: 'ℹ', color: COLORS.blue },
  warn: { icon: '⚠', color: COLORS.yellow },
  error: { icon: '✖', color: COLORS.red },
}

function colorize(text: string, color: string): string {
  return `${color}${text}${COLORS.reset}`
}

function getEnvLogLevel(): LogLevel | undefined {
  const envLevel = process.env.VITE_DEVTOOLS_LOG_LEVEL?.toLowerCase()
  if (envLevel && envLevel in LOG_LEVEL_PRIORITY) {
    return envLevel as LogLevel
  }
  return undefined
}

export function createNodeLogger(options: LoggerOptions = {}): Logger {
  const {
    level = getEnvLogLevel() ?? 'info',
    scope,
    timestamps = false,
    onLog,
  } = options

  let currentLevel = level

  function shouldLog(msgLevel: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[msgLevel] >= LOG_LEVEL_PRIORITY[currentLevel]
  }

  function formatTimestamp(): string {
    return colorize(new Date().toISOString(), COLORS.gray)
  }

  function formatScope(s: string): string {
    return colorize(`[${s}]`, COLORS.cyan)
  }

  function log(entry: LogEntry): void {
    // Always call onLog for aggregation, regardless of level
    onLog?.(entry)

    if (!shouldLog(entry.level) || entry.level === 'silent') {
      return
    }

    const config = LEVEL_CONFIG[entry.level]
    const parts: string[] = []

    // Timestamp (optional)
    if (timestamps) {
      parts.push(formatTimestamp())
    }

    // Icon with color
    parts.push(colorize(config.icon, config.color))

    // Scope
    if (entry.scope) {
      parts.push(formatScope(entry.scope))
    }

    // Message
    parts.push(entry.message)

    // Output
    const output = parts.join(' ')
    const method = entry.level === 'debug' ? 'log' : entry.level
    // eslint-disable-next-line no-console
    console[method](output)

    // Error stack trace
    if (entry.error?.stack) {
      console.error(colorize(entry.error.stack, COLORS.red))
    }

    // Metadata
    if (entry.meta && Object.keys(entry.meta).length > 0) {
      // eslint-disable-next-line no-console
      console.log(colorize('  ↳', COLORS.gray), entry.meta)
    }
  }

  function createLogMethod(level: Exclude<LogLevel, 'silent'>) {
    return (message: string | Error, meta?: Record<string, unknown>) => {
      const isError = message instanceof Error
      const entry: LogEntry = {
        level,
        message: isError ? message.message : message,
        timestamp: Date.now(),
        scope,
        meta,
        error: isError ? message : undefined,
      }
      log(entry)
    }
  }

  const logger: Logger = {
    debug: createLogMethod('debug'),
    info: createLogMethod('info'),
    warn: createLogMethod('warn'),
    error: createLogMethod('error'),

    child(childScope: string): Logger {
      const newScope = scope ? `${scope}:${childScope}` : childScope
      return createNodeLogger({
        level: currentLevel,
        scope: newScope,
        timestamps,
        onLog,
      })
    },

    setLevel(newLevel: LogLevel) {
      currentLevel = newLevel
    },

    getLevel(): LogLevel {
      return currentLevel
    },
  }

  return logger
}

/**
 * Default logger instance for convenience.
 * Use `createNodeLogger()` for custom configuration.
 */
export const logger = createNodeLogger({ scope: 'vite-devtools' })
