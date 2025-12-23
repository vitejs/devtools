import type { DevToolsNodeContext } from '@vitejs/devtools-kit'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export const sharedStateGet = defineRpcFunction({
  name: 'vite:internal:rpc:server-state:get',
  type: 'query',
  setup: (context: DevToolsNodeContext) => {
    return {
      handler: async (key: string) => {
        return await context.rpc.sharedState.get(key)
      },
    }
  },
})
