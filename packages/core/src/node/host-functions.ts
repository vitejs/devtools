import type { DevToolsNodeContext, DevToolsNodeRpcSession, DevToolsRpcClientFunctions, DevToolsRpcServerFunctions, RpcBroadcastOptions, RpcFunctionsHost as RpcFunctionsHostType, RpcSharedStateHost } from '@vitejs/devtools-kit'
import type { BirpcGroup } from 'birpc'
import type { AsyncLocalStorage } from 'node:async_hooks'
import { RpcFunctionsCollectorBase } from '@vitejs/devtools-rpc'
import { createDebug } from 'obug'
import { logger } from './diagnostics'
import { createRpcSharedStateServerHost } from './rpc-shared-state'

const debugBroadcast = createDebug('vite:devtools:rpc:broadcast')

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

  async invokeLocal<
    T extends keyof DevToolsRpcServerFunctions,
    Args extends Parameters<DevToolsRpcServerFunctions[T]>,
  >(
    method: T,
    ...args: Args
  ): Promise<Awaited<ReturnType<DevToolsRpcServerFunctions[T]>>> {
    if (!this.definitions.has(method as string)) {
      throw logger.DTK0020({ name: String(method) }).throw()
    }

    const handler = await this.getHandler(method)
    return await Promise.resolve(
      (handler as (...args: Args) => ReturnType<DevToolsRpcServerFunctions[T]>)(...args),
    ) as Awaited<ReturnType<DevToolsRpcServerFunctions[T]>>
  }

  async broadcast<
    T extends keyof DevToolsRpcClientFunctions,
    Args extends Parameters<DevToolsRpcClientFunctions[T]>,
  >(
    options: RpcBroadcastOptions<T, Args>,
  ): Promise<void> {
    if (!this._rpcGroup)
      return

    debugBroadcast(JSON.stringify(options.method))

    await Promise.allSettled(
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
      throw logger.DTK0021().throw()
    return this._asyncStorage.getStore()
  }
}
