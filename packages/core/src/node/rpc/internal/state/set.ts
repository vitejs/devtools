import type { DevToolsNodeContext } from '@vitejs/devtools-kit'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export const sharedStateSet = defineRpcFunction({
  name: 'vite:internal:rpc:server-state:set',
  type: 'query',
  setup: (context: DevToolsNodeContext) => {
    return {
      handler: async (key: string, value: any, syncId: string) => {
        const state = await context.rpc.sharedState.get(key)
        state.mutate(() => value, syncId)
      },
    }
  },
})
