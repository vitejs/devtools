import type { RpcDefinitionsToFunctions } from '@vitejs/devtools-kit'
import type { DevframeNodeContext } from 'devframe/types'
import type { GetPlanOptions } from '../../shared/types'
import { createDefineWrapperWithContext } from 'devframe/rpc'
import { loadRunPlan, loadTaskGraph } from '../tasks'

// Bind defineRpcFunction to the portable context, as in the Oxc integration.
const defineRpcFunction = createDefineWrapperWithContext<DevframeNodeContext>()

function handleVersionError(error: unknown) {
  // RPC error serialization drops the diagnostic code.
  if (error instanceof Error && error.name === 'VTKDT0002')
    return 'unsupported-version' as const
  throw error
}

export const getGraph = defineRpcFunction({
  name: 'vite-task:get-graph',
  type: 'query',
  cacheable: false,
  jsonSerializable: true,
  setup: ctx => ({ handler: () => loadTaskGraph(ctx.workspaceRoot).catch(handleVersionError) }),
})

export const getPlan = defineRpcFunction({
  name: 'vite-task:get-plan',
  type: 'query',
  cacheable: false,
  jsonSerializable: true,
  setup: ctx => ({ handler: (options: GetPlanOptions) => loadRunPlan(ctx.workspaceRoot, options).catch(handleVersionError) }),
})

export const rpcFunctions = [getGraph, getPlan] as const
export type ServerFunctions = RpcDefinitionsToFunctions<typeof rpcFunctions>

declare module 'devframe/types' {
  interface DevframeRpcServerFunctions extends ServerFunctions {}
}
