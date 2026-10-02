import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getLogsManager } from '../utils'

export const rolldownGetAssetDetails = defineRpcFunction({
  name: 'vite:rolldown:get-asset-details',
  type: 'query',
  jsonSerializable: true,
  cacheable: true,
  dump: async (context) => {
    const manager = getLogsManager(context)
    const sessions = await manager.list()
    const inputs: [{ session: string, id: string }][] = []
    for (const session of sessions) {
      const reader = await manager.loadAssetSession(session.id)
      for (const id of reader.manager.assets.keys())
        inputs.push([{ session: session.id, id }])
    }
    return { inputs }
  },
  setup: (context) => {
    const manager = getLogsManager(context)
    return {
      handler: async ({ session, id }: { session: string, id: string }) => {
        const reader = await manager.loadAssetSession(session)
        const assets = reader.manager.assets
        const chunks = reader.manager.chunks
        const asset = assets.get(id)!
        const assetList = Array.from(assets.values())
        const chunkList = Array.from(chunks.values())

        if (asset.chunk_id === null) {
          // sourceMap or other
          return {
            asset,
          }
        }

        const assetChunkId = asset.chunk_id!
        const chunk = chunks.get(assetChunkId)!
        const importers = chunkList.filter(mod => mod.imports.some(i => i.chunk_id === assetChunkId)).map(c => assetList.find(a => a.chunk_id === c.chunk_id)!)
        const imports = chunk.imports.map(c => assetList.find(a => a.chunk_id === c.chunk_id)!)
        return {
          asset,
          chunk,
          importers,
          imports,
        }
      },
    }
  },
})
