import type { DevToolsNodeRpcSessionMeta } from '@vitejs/devtools-rpc/presets/ws/server'
import type { BirpcReturn } from 'birpc'
import type { RpcFunctionsCollectorBase } from 'birpc-x'
import type { DevToolsRpcClientFunctions, DevToolsRpcServerFunctions } from './rpc-augments'
import type { DevToolsNodeContext } from './vite-plugin'

export type { DevToolsNodeRpcSessionMeta }

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
}
