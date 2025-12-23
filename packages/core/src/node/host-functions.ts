import type { DevToolsNodeContext, DevToolsNodeRpcSession, DevToolsRpcClientFunctions, DevToolsRpcServerFunctions, RpcBroadcastOptions, RpcFunctionsHost as RpcFunctionsHostType, RpcSharedStateHost } from '@vitejs/devtools-kit'
import type { BirpcGroup } from 'birpc'
import type { AsyncLocalStorage } from 'node:async_hooks'
import { RpcFunctionsCollectorBase } from 'birpc-x'
import { createRpcSharedStateServerHost } from './rpc-shared-state'

export class RpcFunctionsHost extends RpcFunctionsCollectorBase<DevToolsRpcServerFunctions, DevToolsNodeContext> implements RpcFunctionsHostType {
  /**
   * @internal
   */
  _rpcGroup: BirpcGroup<DevToolsRpcClientFunctions, DevToolsRpcServerFunctions, false> = undefined!
  _asyncStorage: AsyncLocalStorage<DevToolsNodeRpcSession> = undefined!

  constructor(context: DevToolsNodeContext) {
    super(context)

    this.sharedState = createRpcSharedStateServerHost(this)
  }

  sharedState: RpcSharedStateHost

  async broadcast<
    T extends keyof DevToolsRpcClientFunctions,
    Args extends Parameters<DevToolsRpcClientFunctions[T]>,
  >(
    options: RpcBroadcastOptions<T, Args>,
  ): Promise<void> {
    if (!this._rpcGroup)
      throw new Error('RpcFunctionsHost] RpcGroup is not set, it likely to be an internal bug of Vite DevTools')

    await Promise.all(
      this._rpcGroup.clients.map((client) => {
        if (options.filter?.(client) === false)
          return undefined
        return client.$callRaw({
          optional: true,
          event: true,
          ...options,
        })
      }),
    )
  }

  getCurrentRpcSession(): DevToolsNodeRpcSession | undefined {
    if (!this._asyncStorage)
      throw new Error('RpcFunctionsHost] AsyncLocalStorage is not set, it likely to be an internal bug of Vite DevTools')
    return this._asyncStorage.getStore()
  }
}
