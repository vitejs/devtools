import type { BirpcGroup } from 'birpc'
import type { RpcFunctionsCollectorBase } from 'birpc-x'
import type { DevToolsRpcClientFunctions, DevToolsRpcServerFunctions } from './rpc-augments'
import type { DevToolsNodeContext } from './vite-plugin'

export type RpcFunctionsHost = RpcFunctionsCollectorBase<DevToolsRpcServerFunctions, DevToolsNodeContext> & {
  boardcast: BirpcGroup<DevToolsRpcClientFunctions, DevToolsRpcServerFunctions, false>['broadcast']
}
