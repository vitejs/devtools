import type { DevToolsNodeContext, DevToolsRpcClientFunctions, DevToolsRpcServerFunctions } from '@vitejs/devtools-kit'
import type { BirpcGroup } from 'birpc'
import { RpcFunctionsCollectorBase } from 'birpc-x'

export class RpcFunctionsHost extends RpcFunctionsCollectorBase<DevToolsRpcServerFunctions, DevToolsNodeContext> {
  boardcast: BirpcGroup<DevToolsRpcClientFunctions, DevToolsRpcServerFunctions>['broadcast'] = undefined!

  constructor(
    context: DevToolsNodeContext,
  ) {
    super(context)
  }
}
