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
        const chunk = chunks.get(asset.chunk_id!)!
        return {
          asset,
          chunk,
        }
      },
    }
  },
})
