import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getLogsManager } from '../utils'

export const rolldownGetChunksGraph = defineRpcFunction({
  name: 'vite:rolldown:get-chunks-graph',
  type: 'query',
  jsonSerializable: true,
  cacheable: true,
  dump: async (context) => {
    const manager = getLogsManager(context)
    const sessions = await manager.list()
    return {
      inputs: sessions.map(session => [{ session: session.id }] as const),
    }
  },
  setup: (context) => {
    const manager = getLogsManager(context)
    return {
      handler: async ({ session }: { session: string }) => {
        const reader = await manager.loadAssetSession(session)
        const chunks = Array.from(reader.manager.chunks.values())

        chunks.forEach((chunk) => {
          chunk.asset = reader.manager.chunkAssetMap.get(chunk.chunk_id)
        })
        return chunks
      },
    }
  },
})
