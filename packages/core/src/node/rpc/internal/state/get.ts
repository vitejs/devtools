import type { DevToolsNodeContext, DevToolsRpcSharedStates } from '@vitejs/devtools-kit'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export const sharedStateGet = defineRpcFunction({
  name: 'vite:internal:rpc:server-state:get',
  type: 'query',
  setup: (context: DevToolsNodeContext) => {
    return {
      handler: async (key: string) => {
        const state = await context.rpc.sharedState.get(key as keyof DevToolsRpcSharedStates)
        return state.value()
      },
    }
  },
})
