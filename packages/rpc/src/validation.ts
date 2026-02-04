import type { RpcFunctionDefinitionAny } from './types'

/**
 * Validates RPC function definitions.
 * Action and event functions cannot have dumps (side effects should not be cached).
 *
 * @throws {Error} If an action or event function has a dump configuration
 */
export function validateDefinitions(definitions: readonly RpcFunctionDefinitionAny[]): void {
  for (const definition of definitions) {
    const type = definition.type || 'query'

    if ((type === 'action' || type === 'event') && definition.dump) {
      throw new Error(
        `[devtools-rpc] Function "${definition.name}" with type "${type}" cannot have dump configuration. Only "static" and "query" types support dumps.`,
      )
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
