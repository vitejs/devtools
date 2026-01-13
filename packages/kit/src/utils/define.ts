import type { RpcFunctionDefinition, RpcFunctionSetupResult, RpcFunctionType, Thenable } from 'birpc-x'
import type { GenericSchema, InferInput } from 'valibot'
import type { DevToolsNodeContext } from '../types'
import { createDefineWrapperWithContext } from 'birpc-x'

type InferInputsTuple<AS>
  = AS extends readonly GenericSchema[]
    ? { -readonly [K in keyof AS]: AS[K] extends GenericSchema ? InferInput<AS[K]> : any }
    : any[]

export interface RpcOptions<
  AS,
  RS,
  NAME extends string,
  TYPE extends RpcFunctionType,
> extends Omit<
    RpcFunctionDefinition<
      NAME,
      TYPE,
      InferInputsTuple<AS>,
      RS extends GenericSchema ? InferInput<RS> : any,
      DevToolsNodeContext
    >,
    'setup'
  > {
  args?: AS
  returns?: RS

  setup: (ctx: DevToolsNodeContext) => Thenable<
    RpcFunctionSetupResult<InferInputsTuple<AS>, RS extends GenericSchema ? InferInput<RS> : any>
  >
}

export function defineRpcFunction<AS = undefined, RS = undefined, NAME extends string = string, TYPE extends RpcFunctionType = 'query'>(
  options: RpcOptions<AS, RS, NAME, TYPE>,
) {
  const { args: argsSchema, returns: returnsSchema, ...rest } = options
  const birpc = createDefineWrapperWithContext<DevToolsNodeContext>()

  return {
    fn: birpc<any, TYPE, InferInputsTuple<AS>, RS extends GenericSchema ? InferInput<RS> : any>({
      ...rest,
    }),
    args: argsSchema,
    returns: returnsSchema,
  }
}
