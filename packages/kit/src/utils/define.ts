import type { GenericSchema, InferInput } from 'valibot'
import type { DevToolsNodeContext } from '../types'

import { createDefineWrapperWithContext } from 'birpc-x'

const _define = createDefineWrapperWithContext<DevToolsNodeContext>()

export interface RpcOptions<
  AS extends GenericSchema | undefined,
  RS extends GenericSchema | undefined,
> extends Omit<Parameters<typeof _define>[0], 'setup'> {
  args?: AS
  returns?: RS

  setup: (ctx: DevToolsNodeContext) => {
    handler: (
      params: AS extends GenericSchema ? InferInput<AS> : void,
    ) =>
      | (RS extends GenericSchema ? InferInput<RS> : void)
      | Promise<RS extends GenericSchema ? InferInput<RS> : void>
  }
}

export function defineRpcFunction<
  AS extends GenericSchema | undefined = undefined,
  RS extends GenericSchema | undefined = undefined,
>(options: RpcOptions<AS, RS>) {
  const { args: argsSchema, returns: returnsSchema, ...rest } = options

  return {
    fn: createDefineWrapperWithContext<DevToolsNodeContext>()({ ...rest }),
    args: argsSchema,
    returns: returnsSchema,
  }
}
