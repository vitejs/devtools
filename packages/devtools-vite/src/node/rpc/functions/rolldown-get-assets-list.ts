import { defineRpcFunction } from '../utils'

export const rolldownGetAssetsList = defineRpcFunction({
  name: 'vite:rolldown:get-assets-list',
  type: 'query',
  setup: ({ manager }) => {
    return {
      handler: async ({ session }: { session: string }) => {
        const reader = await manager.loadSession(session)
        return Array.from(reader.manager.assets.values())
      },
    }
  },
})
