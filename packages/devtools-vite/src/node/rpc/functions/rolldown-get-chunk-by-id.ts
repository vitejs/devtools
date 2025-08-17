import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getLogsManager } from '../utils'

export const rolldownGetChunkByID = defineRpcFunction({
  name: 'vite:rolldown:get-chunk-by-id',
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
