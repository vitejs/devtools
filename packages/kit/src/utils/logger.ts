/**
 * Unified Logger API
 *
 * Entry point for the Vite DevTools logging system.
 * Automatically selects the appropriate logger implementation based on environment.
 *
 * @example
 * ```ts
 * import { createLogger } from '@vitejs/devtools-kit/utils/logger'
 *
 * const logger = createLogger({ scope: 'my-plugin' })
 * logger.info('Plugin initialized')
 * logger.debug('Debug info', { config })
 * logger.warn('Deprecated option used')
 * logger.error(new Error('Something went wrong'))
 *
 * // Create child loggers for sub-components
 * const rpcLogger = logger.child('rpc')
 * rpcLogger.info('RPC connected') // [my-plugin:rpc] RPC connected
 * ```
 */

// Re-export collector
export { createLogCollector } from './log-collector'

export type { LogCollectorOptions } from './log-collector'
export { logger as clientLogger, createClientLogger } from './logger-client'

// Environment-specific exports
// These are separate so bundlers can tree-shake the unused implementation

export { createNodeLogger, logger as nodeLogger } from './logger-node'
// Re-export types
export type {
  LogCollector,
  LogEntry,
  LogFilter,
  Logger,
  LoggerOptions,
  LogLevel,
} from './logger-types'

/**
 * Create a logger instance.
 *
 * In Node.js: Uses colored terminal output
 * In Browser: Uses styled console output
 *
 * @param options - Logger configuration options
 * @returns Logger instance
 */
export function createLogger(options?: import('./logger-types').LoggerOptions): import('./logger-types').Logger {
  // Check for browser environment
  if (typeof window !== 'undefined') {
    // Dynamic import for tree-shaking in Node bundles
    // eslint-disable-next-line ts/no-require-imports
    const { createClientLogger } = require('./logger-client')
    return createClientLogger(options)
  }
  else {
    // eslint-disable-next-line ts/no-require-imports
    const { createNodeLogger } = require('./logger-node')
    return createNodeLogger(options)
  }
}
