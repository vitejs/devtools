import { defineRpcFunction } from '../../../../../kit/src'
import { getLogsManager } from '../utils'

export const rolldownGetChunksGraph = defineRpcFunction({
  name: 'vite:rolldown:get-chunks-graph',
  type: 'query',
  setup: (context) => {
    const manager = getLogsManager(context)
    return {
      handler: async ({ session }: { session: string }) => {
        const reader = await manager.loadSession(session)
        return Array.from(reader.manager.chunks.values())
      },
    }
  },
})
