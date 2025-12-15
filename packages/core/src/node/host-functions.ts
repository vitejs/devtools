import type { DevToolsNodeContext, DevToolsRpcClientFunctions, DevToolsRpcServerFunctions, RpcFunctionsHost as RpcFunctionsHostType } from '@vitejs/devtools-kit'
import type { BirpcGroup } from 'birpc'
import { RpcFunctionsCollectorBase } from 'birpc-x'

export class RpcFunctionsHost extends RpcFunctionsCollectorBase<DevToolsRpcServerFunctions, DevToolsNodeContext> implements RpcFunctionsHostType {
  /**
   * @internal
   */
  rpcGroup: BirpcGroup<DevToolsRpcClientFunctions, DevToolsRpcServerFunctions, false> = undefined!

  constructor(context: DevToolsNodeContext) {
    super(context)
  }

  boardcast<
    T extends keyof DevToolsRpcClientFunctions,
    Args extends Parameters<DevToolsRpcClientFunctions[T]>,
  >(
    name: T,
    ...args: Args
  ): Promise<(Awaited<ReturnType<DevToolsRpcClientFunctions[T]>> | undefined)[]> {
    if (!this.rpcGroup)
      throw new Error('RpcFunctionsHost.rpcGroup is not set, it likely to be an internal bug of Vite DevTools')
    // @ts-expect-error - BirpcGroup.broadcast.$callOptional is not typed correctly
    return this.rpcGroup.broadcast.$callOptional<T>(name, ...args)
  }
}
