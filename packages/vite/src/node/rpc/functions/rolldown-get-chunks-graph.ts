import type { RolldownChunkInfo } from '../../../shared/types'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { guessChunkName } from '../../../shared/utils/guess-chunk-name'
import { getLogsManager } from '../utils'

// initial chunks = user-defined entry chunk (initial entry chunk) + user-defined entry chunk's imports (initial common chunk)
export function getInitialChunkIds(chunks: RolldownChunkInfo[]) {
  const chunkMap = new Map(chunks.map(chunk => [chunk.chunk_id, chunk]))
  const entryChunkIds = chunks.filter(chunk => !!chunk.is_user_defined_entry).map(chunk => chunk.chunk_id)
  const visited = new Set<number>()
  const initialChunkIds: number[] = [...entryChunkIds]
  const queue = [...entryChunkIds]

  while (queue.length > 0) {
    const chunkId = queue.shift()!

    if (visited.has(chunkId))
      continue
    visited.add(chunkId)

    const chunk = chunkMap.get(chunkId)
    if (chunk?.imports) {
      for (const _import of chunk.imports) {
        initialChunkIds.push(_import.chunk_id)
        queue.push(_import.chunk_id)
      }
    }
  }

  return [...new Set(initialChunkIds)]
}

export const rolldownGetChunksGraph = defineRpcFunction({
  name: 'vite:rolldown:get-chunks-graph',
  type: 'query',
  setup: (context) => {
    const manager = getLogsManager(context)
    return {
      handler: async ({ session }: { session: string }) => {
        const reader = await manager.loadSession(session)
        const chunks = Array.from(reader.manager.chunks.values())
        chunks.forEach((chunk) => {
          if (chunk && !chunk.name)
            chunk.name = guessChunkName(chunk)
        })
        return chunks
      },
    }
  },
})
