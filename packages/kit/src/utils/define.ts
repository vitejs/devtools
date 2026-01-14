import type { RpcFunctionDefinition, RpcFunctionType } from 'birpc-x'
import type { GenericSchema } from 'valibot'
import type { DevToolsNodeContext } from '../types'
import { createDefineWrapperWithContext } from 'birpc-x'

export interface RpcOptions<
  NAME extends string,
  TYPE extends RpcFunctionType,
  A extends any[],
  R,
  AS extends GenericSchema[] | undefined = undefined,
  RS extends GenericSchema | undefined = undefined,
>
  extends RpcFunctionDefinition<NAME, TYPE, A, R, DevToolsNodeContext> {
  args?: AS
  return?: RS
}

export function defineRpcFunction<
  NAME extends string,
  TYPE extends RpcFunctionType,
  A extends any[],
  R,
  AS extends GenericSchema[] | undefined = undefined,
  RS extends GenericSchema | undefined = undefined,
>(
  options: RpcOptions<NAME, TYPE, A, R, AS, RS>,
) {
  const { args, return: ret, ...rest } = options
  const birpc = createDefineWrapperWithContext<DevToolsNodeContext>()

  const fn = birpc(rest)

  return fn as typeof fn & { argsSchema?: AS, returnSchema?: RS }
}
