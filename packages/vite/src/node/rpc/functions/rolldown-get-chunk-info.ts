import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getLogsManager } from '../utils'

export const rolldownGetChunkInfo = defineRpcFunction({
  name: 'vite:rolldown:get-chunk-info',
  type: 'query',
  setup: (context) => {
    const manager = getLogsManager(context)
    return {
      handler: async ({ session, id }: { session: string, id: number }) => {
        const reader = await manager.loadSession(session)
        const chunk = reader.manager.chunks.get(id)!
        chunk.asset = reader.manager.chunkAssetMap.get(chunk.chunk_id)
        return chunk
      },
    }
  },
})
