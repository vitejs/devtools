import type { BuildInfo } from '../../rolldown/logs-manager'
import { defineRpcFunction } from '../utils'

export const rolldownListSessions = defineRpcFunction({
  name: 'vite:rolldown:list-sessions',
  type: 'query',
  setup: ({ manager }) => {
    return {
      handler: async (): Promise<BuildInfo[]> => {
        const list = await manager.list()
        return list.sort((a, b) => b.timestamp - a.timestamp)
      },
    }
  },
})
