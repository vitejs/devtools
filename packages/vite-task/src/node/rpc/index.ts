import type { RpcDefinitionsToFunctions } from '@vitejs/devtools-kit'
import type { DevframeNodeContext } from 'devframe/types'
import type { GetPlanOptions, TaskSource } from '../../shared/types'
import { createDefineWrapperWithContext, getRpcHandler } from 'devframe/rpc'
import { diagnostics } from '../diagnostics'
import { findPackageConfig, resolveTaskSource } from '../task-source'
import { getIndexedTask, loadRunPlan, loadTaskGraph } from '../tasks'

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

const openInEditor = 'vite:core:open-in-editor'

export const getTaskSource = defineRpcFunction({
  name: 'vite-task:get-task-source',
  type: 'query',
  cacheable: false,
  jsonSerializable: true,
  setup: ctx => ({
    handler: async (id: string): Promise<TaskSource> => {
      const entry = getIndexedTask(ctx.workspaceRoot, id)
      const kind = entry?.kind ?? 'unknown'
      if (!entry || kind === 'unknown' || !ctx.rpc.definitions.has(openInEditor))
        return { kind, canOpen: false }
      return { kind, canOpen: kind === 'script' || !!await findPackageConfig(ctx.workspaceRoot, entry.packageDir) }
    },
  }),
})

export const openTaskSource = defineRpcFunction({
  name: 'vite-task:open-task-source',
  type: 'action',
  setup: ctx => ({
    handler: async (id: string, expected: 'script' | 'config') => {
      const editor = ctx.rpc.definitions.get(openInEditor)
      if (!editor)
        throw diagnostics.VTKDT0006({ reason: 'This host cannot open a local editor.' })
      const entry = getIndexedTask(ctx.workspaceRoot, id)
      if (!entry || entry.kind === 'unknown' || entry.kind !== expected)
        throw diagnostics.VTKDT0006({ reason: 'The task source has changed or is unavailable. Refresh the task list.' })
      const target = await resolveTaskSource(ctx.workspaceRoot, entry.packageDir, entry.task, expected)
      const open = await getRpcHandler(editor, ctx.rpc.context)
      await open(target)
    },
  }),
})

export const rpcFunctions = [getGraph, getPlan, getTaskSource, openTaskSource] as const
export type ServerFunctions = RpcDefinitionsToFunctions<typeof rpcFunctions>

declare module 'devframe/types' {
  interface DevframeRpcServerFunctions extends ServerFunctions {}
}
