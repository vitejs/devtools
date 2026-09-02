import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getLogsManager } from '../utils'

export const rolldownRenameSession = defineRpcFunction({
  name: 'vite:rolldown:rename-session',
  type: 'action',
  setup: (context) => {
    const manager = getLogsManager(context)
    return {
      handler: async ({ session, alias }: { session: string, alias: string }): Promise<{ id: string, alias: string }> => {
        const saved = await manager.renameSession(session, alias)
        return { id: session, alias: saved }
      },
    }
  },
})
