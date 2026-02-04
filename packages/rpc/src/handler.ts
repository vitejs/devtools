import type { RpcFunctionDefinition, RpcFunctionSetupResult, RpcFunctionType } from './types'

export async function getRpcResolvedSetupResult<
  NAME extends string,
  TYPE extends RpcFunctionType,
  ARGS extends any[],
  RETURN = void,
  CONTEXT = undefined,
>(
  definition: RpcFunctionDefinition<NAME, TYPE, ARGS, RETURN, any, any, CONTEXT>,
  context: CONTEXT,
): Promise<RpcFunctionSetupResult<ARGS, RETURN>> {
  if (definition.__resolved) {
    return definition.__resolved
  }
  if (!definition.setup) {
    return {}
  }
  definition.__promise ??= Promise.resolve(definition.setup(context))
    .then((r) => {
      definition.__resolved = r
      definition.__promise = undefined
      return r
    })
  const result = definition.__resolved ??= await definition.__promise
  return result
}

export async function getRpcHandler<
  NAME extends string,
  TYPE extends RpcFunctionType,
  ARGS extends any[],
  RETURN = void,
  CONTEXT = undefined,
>(
  definition: RpcFunctionDefinition<NAME, TYPE, ARGS, RETURN, any, any, CONTEXT>,
  context: CONTEXT,
): Promise<(...args: ARGS) => RETURN> {
  if (definition.handler) {
    return definition.handler
  }
  const result = await getRpcResolvedSetupResult(definition, context)
  if (!result.handler) {
    throw new Error(`[devtools-rpc] Either handler or setup function must be provided for RPC function "${definition.name}"`)
  }
  return result.handler
}
