import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getLogsManager } from '../utils'

export const rolldownGetChunksGraph = defineRpcFunction({
  name: 'vite:rolldown:get-chunks-graph',
  type: 'query',
  setup: (context) => {
    const manager = getLogsManager(context)
    return {
      handler: async ({ session }: { session: string }) => {
        const reader = await manager.loadSession(session)
        const chunks = Array.from(reader.manager.chunks.values())

        chunks.forEach((chunk) => {
          chunk.asset = reader.manager.chunkAssetMap.get(chunk.chunk_id)
        })
        return chunks
      },
    }
  },
})
