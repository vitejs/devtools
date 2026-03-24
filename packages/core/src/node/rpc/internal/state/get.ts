import type { DevToolsNodeContext, DevToolsRpcSharedStates } from '@vitejs/devtools-kit'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export const sharedStateGet = defineRpcFunction({
  name: 'devtoolskit:internal:rpc:server-state:get',
  type: 'query',
  dump: (context: DevToolsNodeContext) => {
    const host = context.rpc.sharedState
    return {
      inputs: host.keys().map(key => [key] as const),
    }
  },
  setup: (context: DevToolsNodeContext) => {
    return {
      handler: async (key: string): Promise<any> => {
        if (!context.rpc.sharedState.keys().includes(key))
          return undefined
        const state = await context.rpc.sharedState.get(key as keyof DevToolsRpcSharedStates)
        return state.value()
      },
    }
  },
})
