/**
 * Logger Implementation for Browser/Client
 *
 * A lightweight, scoped logger for client-side Vite DevTools code.
 * Supports styled console output, log levels, and log aggregation.
 */

import type { LogEntry, Logger, LoggerOptions, LogLevel } from './logger-types'

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
}

const LEVEL_STYLES: Record<Exclude<LogLevel, 'silent'>, string> = {
  debug: 'color: #9ca3af; font-weight: normal',
  info: 'color: #3b82f6; font-weight: normal',
  warn: 'color: #f59e0b; font-weight: bold',
  error: 'color: #ef4444; font-weight: bold',
}

const LEVEL_ICONS: Record<Exclude<LogLevel, 'silent'>, string> = {
  debug: '🔍',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
}

export function createClientLogger(options: LoggerOptions = {}): Logger {
  const {
    level = 'info',
    scope,
    timestamps = false,
    onLog,
  } = options

  let currentLevel = level

  function shouldLog(msgLevel: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[msgLevel] >= LOG_LEVEL_PRIORITY[currentLevel]
  }

  function log(entry: LogEntry): void {
    // Always call onLog for aggregation, regardless of level
    onLog?.(entry)

    if (!shouldLog(entry.level) || entry.level === 'silent') {
      return
    }

    const style = LEVEL_STYLES[entry.level]
    const icon = LEVEL_ICONS[entry.level]
    const scopeText = entry.scope ? `[${entry.scope}]` : '[vite-devtools]'
    const time = timestamps ? `${new Date(entry.timestamp).toISOString()} ` : ''

    // Build the formatted message
    const prefix = `${time}${icon} ${scopeText}`

    const method = entry.level === 'debug' ? 'log' : entry.level

    // Use styled console output
    // eslint-disable-next-line no-console
    console[method](
      `%c${prefix}%c ${entry.message}`,
      style,
      'color: inherit; font-weight: normal',
    )

    // Log error stack if present
    if (entry.error?.stack) {
      console.error(entry.error)
    }

    // Log metadata if present
    if (entry.meta && Object.keys(entry.meta).length > 0) {
      // eslint-disable-next-line no-console
      console.log('  ↳', entry.meta)
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
      return createClientLogger({
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
 * Use `createClientLogger()` for custom configuration.
 */
export const logger = createClientLogger({ scope: 'vite-devtools' })
