import { defineRpcFunction } from '../utils'

export const rolldownGetModuleRawEvents = defineRpcFunction({
  name: 'vite:rolldown:get-module-raw-events',
  type: 'query',
  setup: ({ manager }) => {
    return {
      handler: async ({ session, module }: { session: string, module: string }) => {
        const reader = await manager.loadSession(session)
        const events = reader.manager.events.filter(event => 'module_id' in event && event.module_id !== module)
        return {
          events,
        }
      },
    }
  },
})
