import type { DevToolsNodeContext } from '@vitejs/devtools-kit'
import type { SharedStatePatch } from '@vitejs/devtools-kit/utils/shared-state'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export const sharedStatePatch = defineRpcFunction({
  name: 'vite:internal:rpc:server-state:patch',
  type: 'query',
  setup: (context: DevToolsNodeContext) => {
    return {
      handler: async (key: string, patches: SharedStatePatch[], syncId: string) => {
        const state = await context.rpc.sharedState.get(key)
        state.patch(patches, syncId)
      },
    }
  },
})
