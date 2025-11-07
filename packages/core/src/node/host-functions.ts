import type { DevToolsNodeContext, DevToolsRpcServerFunctions } from '@vitejs/devtools-kit'
import { RpcFunctionsCollectorBase } from 'birpc-x'

export class RpcFunctionsHost extends RpcFunctionsCollectorBase<DevToolsRpcServerFunctions, DevToolsNodeContext> {
  constructor(
    context: DevToolsNodeContext,
  ) {
    super(context)
  }
}
