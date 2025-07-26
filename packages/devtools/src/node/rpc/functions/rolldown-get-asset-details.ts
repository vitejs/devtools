import { defineRpcFunction } from '../utils'

export const rolldownGetAssetDetails = defineRpcFunction({
  name: 'vite:rolldown:get-asset-details',
  type: 'query',
  setup: ({ manager }) => {
    return {
      handler: async ({ session, id }: { session: string, id: string }) => {
        const reader = await manager.loadSession(session)
        const assets = await reader.manager.assets
        const chunks = await reader.manager.chunks
        const asset = assets.get(id)!
        const assetList = Array.from(assets.values())
        const assetChunkId = asset.chunk_id!
        const chunk = chunks.get(assetChunkId)!
        const importers = Array.from(chunks.values()).filter(mod => mod.imports.some(i => i.chunk_id === assetChunkId)).map(c => assetList.find(a => a.chunk_id === c.chunk_id)!)
        return {
          asset,
          chunk,
          importers,
        }
      },
    }
  },
})
