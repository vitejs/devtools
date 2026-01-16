import type { DevToolsNodeContext, DevToolsRpcSharedStates } from '@vitejs/devtools-kit'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export const sharedStateSet = defineRpcFunction({
  name: 'devtoolskit:internal:rpc:server-state:set',
  type: 'query',
  setup: (context: DevToolsNodeContext) => {
    return {
      handler: async (key: string, value: any, syncId: string) => {
        const state = await context.rpc.sharedState.get(key as keyof DevToolsRpcSharedStates)
        state.mutate(() => value, syncId)
      },
    }
  },
})
