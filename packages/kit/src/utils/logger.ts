/**
 * Logger API using Consola
 *
 * Provides a simple logger interface using unjs/consola, similar to Nuxt Kit.
 * Exposed on context.logger for use in DevTools plugins.
 *
 * @example
 * ```ts
 * export default defineDevToolsPlugin({
 *   setup(context) {
 *     context.logger.info('Plugin initialized')
 *     context.logger.debug('Debug info', { config })
 *     context.logger.warn('Deprecated option used')
 *     context.logger.error(new Error('Something went wrong'))
 *
 *     // Create child loggers for sub-components
 *     const rpcLogger = context.logger.withTag('rpc')
 *     rpcLogger.info('RPC connected') // [rpc] RPC connected
 *   }
 * })
 * ```
 */

import { consola } from 'consola'

export type { ConsolaInstance as Logger } from 'consola'

/**
 * Create a logger instance with the given tag/scope.
 * Similar to Nuxt Kit's useLogger.
 *
 * @param tag - Tag/scope for the logger (e.g., 'my-plugin', 'rpc')
 * @returns Consola logger instance
 */
export function createLogger(tag?: string): ReturnType<typeof consola.withTag> {
  return tag ? consola.withTag(tag) : consola
}

/**
 * Default logger instance.
 */
export const logger = consola
