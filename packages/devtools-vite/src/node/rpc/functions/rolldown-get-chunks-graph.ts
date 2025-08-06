import { defineRpcFunction } from '../utils'

export const rolldownGetChunksGraph = defineRpcFunction({
  name: 'vite:rolldown:get-chunks-graph',
  type: 'query',
  setup: ({ manager }) => {
    return {
      handler: async ({ session }: { session: string }) => {
        const reader = await manager.loadSession(session)
        return Array.from(reader.manager.chunks.values())
      },
    }
  },
})
