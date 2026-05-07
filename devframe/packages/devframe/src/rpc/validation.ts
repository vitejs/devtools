import type { RpcFunctionDefinitionAny } from './types'
import { logger } from './diagnostics'

/**
 * Validates RPC function definitions.
 * Action, event, and generator functions cannot have dumps (side effects
 * and streaming results are not cacheable).
 *
 * Generator-specific validation (`agent`, `yields`, `cacheable`,
 * `jsonSerializable`) lives in `node/rpc-generators.ts:attachRpcGenerators`,
 * which has access to the streaming-related diagnostics in `node/diagnostics.ts`.
 *
 * @throws {Error} If an action / event / generator function has a dump configuration
 */
export function validateDefinitions(definitions: readonly RpcFunctionDefinitionAny[]): void {
  for (const definition of definitions) {
    const type = definition.type || 'query'

    if ((type === 'action' || type === 'event' || type === 'generator') && (definition as any).dump) {
      throw logger.DF0027({ name: definition.name, type }).throw()
    }

    if ((definition as any).snapshot && type !== 'query') {
      throw logger.DF0028({ name: definition.name, type }).throw()
    }
  }
}

/**
 * Validates a single RPC function definition.
 *
 * @throws {Error} If an action or event function has a dump configuration
 */
export function validateDefinition(definition: RpcFunctionDefinitionAny): void {
  validateDefinitions([definition])
}
