import type { DevToolsNodeContext, RpcFunctionDefinition, RpcFunctionType } from '../types'
import Debug from 'debug'

const debug = Debug('vite:devtools:rpc')

export function defineRpcFunction<
  NAME extends string,
  TYPE extends RpcFunctionType,
  ARGS extends any[],
  RETURN = void,
>(
  definition: RpcFunctionDefinition<NAME, TYPE, ARGS, RETURN>,
): RpcFunctionDefinition<NAME, TYPE, ARGS, RETURN> {
  return definition
}

export async function getRpcHandler<
  NAME extends string,
  TYPE extends RpcFunctionType,
  ARGS extends any[],
  RETURN = void,
>(
  definition: RpcFunctionDefinition<NAME, TYPE, ARGS, RETURN>,
  context: DevToolsNodeContext,
): Promise<(...args: ARGS) => RETURN> {
  let handler: (...args: ARGS) => RETURN

  if (definition.handler) {
    handler = definition.handler
  }
  else if (definition.__resolved?.handler) {
    handler = definition.__resolved.handler
  }
  else {
    definition.__promise ??= Promise.resolve(definition.setup(context))
      .then((r) => {
        definition.__resolved = r
        definition.__promise = undefined
        return r
      })
    const result = definition.__resolved ??= await definition.__promise
    handler = result.handler
  }

  return ((...args: ARGS) => {
    try {
      const result = handler(...args)
      if (result instanceof Promise) {
        return result.catch((error) => {
          debug(`RPC call "${definition.name}" failed:`, error)
          throw error
        }) as RETURN
      }
      return result
    }
    catch (error) {
      debug(`RPC call "${definition.name}" failed:`, error)
      throw error
    }
  }) as (...args: ARGS) => RETURN
}
