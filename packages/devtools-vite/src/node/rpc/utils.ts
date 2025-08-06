import type { RpcContext, RpcFunctionDefinition, RpcFunctionType } from './types'

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
  const result = definition.__resolved ??= await definition.setup(context)
  return result.handler
}
