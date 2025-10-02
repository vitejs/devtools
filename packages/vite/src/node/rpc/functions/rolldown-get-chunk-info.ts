import { defineRpcFunction } from '../../../../../kit/src'
import { getLogsManager } from '../utils'

export const rolldownGetChunkInfo = defineRpcFunction({
  name: 'vite:rolldown:get-chunk-info',
  type: 'query',
  setup: (context) => {
    const manager = getLogsManager(context)
    return {
      handler: async ({ session, id }: { session: string, id: number }) => {
        const reader = await manager.loadSession(session)
        return reader.manager.chunks.get(id)
      },
    }
  },
})
