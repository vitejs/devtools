import type { RpcFunctionsCollectorBase } from 'birpc-x'
import type { DevToolsRpcClientFunctions, DevToolsRpcServerFunctions } from './rpc-augments'
import type { DevToolsNodeContext } from './vite-plugin'

export type RpcFunctionsHost = RpcFunctionsCollectorBase<DevToolsRpcServerFunctions, DevToolsNodeContext> & {
  boardcast: <
    T extends keyof DevToolsRpcClientFunctions,
    Args extends Parameters<DevToolsRpcClientFunctions[T]>,
  >(
    name: T,
    ...args: Args
  ) => Promise<(Awaited<ReturnType<DevToolsRpcClientFunctions[T]>> | undefined)[]>
}
