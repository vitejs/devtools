import type { RolldownChunkInfo } from '../../shared/types'

// initial chunks = user-defined entry chunk (initial entry chunk) + the chunks it statically imports (initial common chunk).
// Dynamic imports load on demand, so the chunks behind them stay async.
export function getInitialChunkIds(chunks: RolldownChunkInfo[]) {
  const chunkMap = new Map(chunks.map(chunk => [chunk.chunk_id, chunk]))
  const entryChunkIds = chunks.filter(chunk => !!chunk.is_user_defined_entry).map(chunk => chunk.chunk_id)
  const visited = new Set<number>()
  const initialChunkIds = new Set<number>(entryChunkIds)
  const queue = [...entryChunkIds]

  while (queue.length > 0) {
    const chunkId = queue.shift()!

    if (visited.has(chunkId))
      continue
    visited.add(chunkId)

    const chunk = chunkMap.get(chunkId)
    if (chunk?.imports) {
      for (const _import of chunk.imports) {
        if (_import.kind === 'dynamic-import')
          continue
        if (!initialChunkIds.has(_import.chunk_id)) {
          initialChunkIds.add(_import.chunk_id)
          queue.push(_import.chunk_id)
        }
      }
    }
  }

  return initialChunkIds
}
