import type { RpcFunctionDefinition, RpcFunctionSetupResult, RpcFunctionType } from './types'
import { logger } from './diagnostics'

// The framework substitutes generator-typed definitions with an `action`
// wrapper at registration (see `node/rpc-generators.ts`), so handler.ts
// only ever sees non-generator types at runtime. The casts below let the
// generic helpers operate over the full `RpcFunctionDefinition` union
// without having to thread generator-specific return shapes through.

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
  const def = definition as { __resolved?: any, __promise?: any, setup?: (ctx: CONTEXT) => any, name: string }
  if (def.__resolved) {
    return def.__resolved as RpcFunctionSetupResult<ARGS, RETURN>
  }
  if (!def.setup) {
    return {}
  }
  def.__promise ??= Promise.resolve(def.setup(context))
    .then((r: any) => {
      def.__resolved = r
      def.__promise = undefined
      return r
    })
  const result = (def.__resolved ??= await def.__promise) as RpcFunctionSetupResult<ARGS, RETURN>
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
  const def = definition as { handler?: (...args: ARGS) => RETURN, name: string }
  if (def.handler) {
    return def.handler
  }
  const result = await getRpcResolvedSetupResult(definition, context)
  if (!result.handler) {
    throw logger.DF0024({ name: def.name }).throw()
  }
  return result.handler
}
