import type { RpcContext, RpcFunctionDefinition, RpcFunctionType } from '../types'

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
  context: RpcContext,
): Promise<(...args: ARGS) => RETURN> {
  if (definition.handler) {
    return definition.handler
  }
  if (definition.__resolved?.handler) {
    return definition.__resolved.handler
  }
  definition.__promise ??= Promise.resolve(definition.setup(context))
    .then((r) => {
      definition.__resolved = r
      definition.__promise = undefined
      return r
    })
  const result = definition.__resolved ??= await definition.__promise
  return result.handler
}
