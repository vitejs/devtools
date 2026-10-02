import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getLogsManager } from '../utils'

export const rolldownGetAssetsList = defineRpcFunction({
  name: 'vite:rolldown:get-assets-list',
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
        return Array.from(reader.manager.assets.values())
      },
    }
  },
})
