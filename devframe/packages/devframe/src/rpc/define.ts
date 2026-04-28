import type { RpcArgsSchema, RpcFunctionDefinition, RpcFunctionType, RpcReturnSchema } from './types'

export function defineRpcFunction<
  NAME extends string,
  TYPE extends RpcFunctionType,
  ARGS extends any[],
  RETURN = void,
  const AS extends RpcArgsSchema | undefined = undefined,
  const RS extends RpcReturnSchema | undefined = undefined,
>(
  definition: RpcFunctionDefinition<NAME, TYPE, ARGS, RETURN, AS, RS>,
): RpcFunctionDefinition<NAME, TYPE, ARGS, RETURN, AS, RS> {
  return definition
}

export function createDefineWrapperWithContext<CONTEXT>() {
  return function defineRpcFunctionWithContext<
    NAME extends string,
    TYPE extends RpcFunctionType,
    ARGS extends any[],
    RETURN = void,
    const AS extends RpcArgsSchema | undefined = undefined,
    const RS extends RpcReturnSchema | undefined = undefined,
  >(
    definition: RpcFunctionDefinition<NAME, TYPE, ARGS, RETURN, AS, RS, CONTEXT>,
  ): RpcFunctionDefinition<NAME, TYPE, ARGS, RETURN, AS, RS, CONTEXT> {
    return definition
  }
}
