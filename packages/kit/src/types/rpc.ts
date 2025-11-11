import type { RpcFunctionsCollectorBase } from 'birpc-x'
import type { DevToolsRpcServerFunctions } from './rpc-augments'
import type { DevToolsNodeContext } from './vite-plugin'

export type RpcFunctionsHost = RpcFunctionsCollectorBase<DevToolsRpcServerFunctions, DevToolsNodeContext>
