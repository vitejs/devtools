import type { BirpcReturn } from 'birpc'
import type { RpcFunctionsCollectorBase } from 'birpc-x'
import type { WebSocket } from 'ws'
import type { SharedState } from '../utils/shared-state'
import type { DevToolsRpcClientFunctions, DevToolsRpcServerFunctions } from './rpc-augments'
import type { DevToolsNodeContext } from './vite-plugin'

export interface DevToolsNodeRpcSessionMeta {
  id: number
  ws?: WebSocket
  clientAuthId?: string
  isTrusted?: boolean
}

export interface DevToolsNodeRpcSession {
  meta: DevToolsNodeRpcSessionMeta
  rpc: BirpcReturn<DevToolsRpcClientFunctions, DevToolsRpcServerFunctions, false>
}

export type RpcFunctionsHost = RpcFunctionsCollectorBase<DevToolsRpcServerFunctions, DevToolsNodeContext> & {
  /**
   * Broadcast a message to all connected clients
   */
  broadcast: <
    T extends keyof DevToolsRpcClientFunctions,
    Args extends Parameters<DevToolsRpcClientFunctions[T]>,
  >(
    name: T,
    ...args: Args
  ) => Promise<(Awaited<ReturnType<DevToolsRpcClientFunctions[T]>> | undefined)[]>

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
  initialValue?: T
}

export interface RpcSharedStateHost {
  get: <T extends object>(key: string, options?: RpcSharedStateGetOptions<T>) => Promise<SharedState<T>>
}
