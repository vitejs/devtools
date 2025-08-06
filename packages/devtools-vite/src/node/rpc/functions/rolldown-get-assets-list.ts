import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getLogsManager } from '../utils'

export const rolldownGetAssetsList = defineRpcFunction({
  name: 'vite:rolldown:get-assets-list',
  type: 'query',
  setup: (context) => {
    const manager = getLogsManager(context)
    return {
      handler: async ({ session }: { session: string }) => {
        const reader = await manager.loadSession(session)
        return Array.from(reader.manager.assets.values())
      },
    }
  },
})
