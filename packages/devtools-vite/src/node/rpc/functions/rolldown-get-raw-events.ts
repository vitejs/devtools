import { defineRpcFunction } from '../utils'

export const rolldownGetRawEvents = defineRpcFunction({
  name: 'vite:rolldown:get-raw-events',
  type: 'query',
  setup: ({ manager }) => {
    return {
      handler: async ({ session }: { session: string }) => {
        const reader = await manager.loadSession(session)
        return reader.manager.events
      },
    }
  },
})
