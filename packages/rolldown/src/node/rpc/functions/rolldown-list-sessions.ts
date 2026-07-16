import type { BuildInfo } from '../../rolldown/logs-manager'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getLogsManager } from '../utils'

export const rolldownListSessions = defineRpcFunction({
  name: 'vite:rolldown:list-sessions',
  // Not client-cached: the "Run build" button re-fetches this to surface the
  // session a fresh build just produced, so the list must stay live.
  type: 'static',
  jsonSerializable: true,
  setup: (context) => {
    const manager = getLogsManager(context)
    return {
      handler: async (): Promise<BuildInfo[]> => {
        const list = await manager.list()
        return list.sort((a, b) => b.timestamp - a.timestamp)
      },
    }
  },
})
