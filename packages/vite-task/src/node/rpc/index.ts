import type { RpcDefinitionsToFunctions } from '@vitejs/devtools-kit'
import type { DevframeNodeContext } from 'devframe/types'
import type { GetPlanOptions, GraphTask, TaskSource } from '../../shared/types'
import { isDeepStrictEqual } from 'node:util'
import { createDefineWrapperWithContext, getRpcHandler } from 'devframe/rpc'
import { diagnostics } from '../diagnostics'
import { findTaskSource } from '../task-source'
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

async function resolveSelectedSource(workspaceRoot: string, id: string, kind: TaskSource['kind'], command: GraphTask['command']) {
  const entry = getIndexedTask(workspaceRoot, id)
  if (!entry || kind === 'unknown' || entry.task.sourceKind !== kind || !isDeepStrictEqual(entry.task.command, command))
    return
  return findTaskSource(workspaceRoot, entry.packageDir, entry.task, kind)
}

export const getTaskSource = defineRpcFunction({
  name: 'vite-task:get-task-source',
  type: 'query',
  cacheable: false,
  jsonSerializable: true,
  setup: ctx => ({
    handler: async (id: string, kind: TaskSource['kind'], command: GraphTask['command']): Promise<TaskSource> => {
      const canOpen = ctx.rpc.definitions.has(openInEditor) && !!await resolveSelectedSource(ctx.workspaceRoot, id, kind, command)
      return { kind, canOpen }
    },
  }),
})

export const openTaskSource = defineRpcFunction({
  name: 'vite-task:open-task-source',
  type: 'action',
  setup: ctx => ({
    handler: async (id: string, expected: 'script' | 'config', command: GraphTask['command']) => {
      const editor = ctx.rpc.definitions.get(openInEditor)
      if (!editor)
        throw diagnostics.VTKDT0006({ reason: 'This host cannot open a local editor.' })
      const target = await resolveSelectedSource(ctx.workspaceRoot, id, expected, command)
      if (!target) {
        const reason = expected === 'config'
          ? 'Check that the task is current and its package contains a single accessible Vite configuration file.'
          : 'The task source has changed or is unavailable. Refresh the task list.'
        throw diagnostics.VTKDT0006({ reason })
      }
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
