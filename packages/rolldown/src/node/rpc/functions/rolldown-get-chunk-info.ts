import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getLogsManager } from '../utils'

export const rolldownGetChunkInfo = defineRpcFunction({
  name: 'vite:rolldown:get-chunk-info',
  type: 'query',
  jsonSerializable: true,
  cacheable: true,
  dump: async (context) => {
    const manager = getLogsManager(context)
    const sessions = await manager.list()
    const inputs: [{ session: string, id: number }][] = []
    for (const session of sessions) {
      const reader = await manager.loadAssetSession(session.id)
      for (const id of reader.manager.chunks.keys())
        inputs.push([{ session: session.id, id }])
    }
    return { inputs }
  },
  setup: (context) => {
    const manager = getLogsManager(context)
    return {
      handler: async ({ session, id }: { session: string, id: number }) => {
        const reader = await manager.loadAssetSession(session)
        const chunk = reader.manager.chunks.get(id)!
        chunk.asset = reader.manager.chunkAssetMap.get(chunk.chunk_id)
        return chunk
      },
    }
  },
})
