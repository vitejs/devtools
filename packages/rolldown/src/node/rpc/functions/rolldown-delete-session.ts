import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getLogsManager } from '../utils'

export const rolldownDeleteSession = defineRpcFunction({
  name: 'vite:rolldown:delete-session',
  type: 'action',
  setup: (context) => {
    const manager = getLogsManager(context)
    return {
      handler: async ({ session }: { session: string }): Promise<{ id: string }> => {
        await manager.deleteSession(session)
        return { id: session }
      },
    }
  },
})
