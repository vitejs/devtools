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
          const assets = Array.from(_reader.manager.assets.values())
          const chunks = Array.from(_reader.manager.chunks.values())
          const initialChunkIds = chunks.filter(chunk => chunk.is_initial).map(chunk => chunk.chunk_id)

          return {
            id: s,
            meta: _reader.meta!,
            build_duration: _reader.manager.build_end_time - _reader.manager.build_start_time,
            modules: Array.from(_reader.manager.modules.values()).length,
            chunks: chunks.length,
            assets: assets.length,
            bundle_size: assets.reduce((acc, asset) => acc + asset.size, 0),
            initial_js: initialChunkIds.reduce((acc, chunkId) => acc + (assets.find(asset => asset.chunk_id === chunkId)?.size || 0), 0),
          }
        })
      },
    }
  },
})
