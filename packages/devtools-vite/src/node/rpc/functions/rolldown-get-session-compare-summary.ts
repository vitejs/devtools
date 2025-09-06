import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getLogsManager } from '../utils'

export const rolldownGetSessionCompareSummary = defineRpcFunction({
  name: 'vite:rolldown:get-session-compare-summary',
  type: 'query',
  setup: async (context) => {
    const manager = getLogsManager(context)
    return {
      handler: async ({ sessions }: { sessions: string[] }) => {
        const reader = await Promise.all(sessions.map(s => manager.loadSession(s)))

        return sessions.map((s, index) => {
          const _reader = reader[index]!
          return {
            id: s,
            meta: _reader.meta!,
            build_duration: _reader.manager.build_end_time - _reader.manager.build_start_time,
            modules: Array.from(_reader.manager.modules.values()).length,
            chunks: Array.from(_reader.manager.chunks.values()).length,
            assets: Array.from(_reader.manager.assets.values()).length,
          }
        })
      },
    }
  },
})
