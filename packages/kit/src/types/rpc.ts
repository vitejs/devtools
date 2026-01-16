import type { DevToolsNodeRpcSessionMeta } from '@vitejs/devtools-rpc/presets/ws/server'
import type { BirpcReturn } from 'birpc'
import type { RpcFunctionsCollectorBase } from 'birpc-x'
import type { SharedState } from '../utils/shared-state'
import type { DevToolsRpcClientFunctions, DevToolsRpcServerFunctions, DevToolsRpcSharedStates } from './rpc-augments'
import type { DevToolsNodeContext } from './vite-plugin'

export type { DevToolsNodeRpcSessionMeta }

export interface DevToolsNodeRpcSession {
  meta: DevToolsNodeRpcSessionMeta
  rpc: BirpcReturn<DevToolsRpcClientFunctions, DevToolsRpcServerFunctions, false>
}

export interface RpcBroadcastOptions<METHOD, Args extends any[]> {
  method: METHOD
  args: Args
  optional?: boolean
  event?: boolean
  filter?: (client: BirpcReturn<DevToolsRpcClientFunctions, DevToolsRpcServerFunctions, false>) => boolean | void
}

export type RpcFunctionsHost = RpcFunctionsCollectorBase<DevToolsRpcServerFunctions, DevToolsNodeContext> & {
  /**
   * Broadcast a message to all connected clients
   */
  broadcast: <
    T extends keyof DevToolsRpcClientFunctions,
    Args extends Parameters<DevToolsRpcClientFunctions[T]>,
  >(
    options: RpcBroadcastOptions<T, Args>,
  ) => Promise<void>

  /**
   * Get the current RPC client
   *
   * Available in RPC functions to get the current RPC client
   */
  getCurrentRpcSession: () => DevToolsNodeRpcSession | undefined

  /**
   * The shared state host
   */
  sharedState: RpcSharedStateHost
}

export interface RpcSharedStateGetOptions<T> {
  sharedState?: SharedState<T>
  initialValue?: T
}

export interface RpcSharedStateHost {
  get: <T extends keyof DevToolsRpcSharedStates>(key: T, options?: RpcSharedStateGetOptions<DevToolsRpcSharedStates[T]>) => Promise<SharedState<DevToolsRpcSharedStates[T]>>
}
