import type { RolldownChunkInfo } from '../../../shared/types'
import { describe, expect, it } from 'vitest'
import { RolldownEventsManager } from '../../rolldown/events-manager'
import { getInitialChunkIds } from '../chunk'

function chunk(options: Pick<RolldownChunkInfo, 'chunk_id'> & Partial<RolldownChunkInfo>): RolldownChunkInfo {
  return {
    name: null,
    advanced_chunk_group_id: null,
    is_user_defined_entry: false,
    is_async_entry: false,
    entry_module: null,
    modules: [],
    reason: 'common',
    imports: [],
    ...options,
  }
}

describe('initial chunks', () => {
  it('follows static chains and cycles while excluding dynamic-only subtrees', () => {
    const chunks = [
      chunk({ chunk_id: 0, is_user_defined_entry: true, imports: [{ chunk_id: 1, kind: 'import-statement' }, { chunk_id: 2, kind: 'dynamic-import' }] }),
      chunk({ chunk_id: 1, imports: [{ chunk_id: 0, kind: 'import-statement' }, { chunk_id: 3, kind: 'import-statement' }] }),
      chunk({ chunk_id: 2, imports: [{ chunk_id: 4, kind: 'import-statement' }] }),
      chunk({ chunk_id: 3, imports: [] }),
      chunk({ chunk_id: 4, imports: [] }),
      chunk({ chunk_id: 5, is_user_defined_entry: true, imports: [{ chunk_id: 3, kind: 'import-statement' }] }),
    ]
    expect([...getInitialChunkIds(chunks)].sort()).toEqual([0, 1, 3, 5])
  })

  it('includes chunks reachable through both static and dynamic imports', () => {
    const chunks = [
      chunk({ chunk_id: 0, is_user_defined_entry: true, imports: [{ chunk_id: 1, kind: 'dynamic-import' }, { chunk_id: 2, kind: 'import-statement' }] }),
      chunk({ chunk_id: 1, imports: [{ chunk_id: 3, kind: 'import-statement' }] }),
      chunk({ chunk_id: 2, imports: [{ chunk_id: 1, kind: 'import-statement' }] }),
      chunk({ chunk_id: 3, imports: [] }),
    ]
    expect([...getInitialChunkIds(chunks)].sort()).toEqual([0, 1, 2, 3])
  })

  it('keeps user-defined entries initial even when another entry imports them dynamically', () => {
    const chunks = [
      chunk({ chunk_id: 0, is_user_defined_entry: true, imports: [{ chunk_id: 1, kind: 'dynamic-import' }] }),
      chunk({ chunk_id: 1, is_user_defined_entry: true, imports: [{ chunk_id: 2, kind: 'import-statement' }] }),
      chunk({ chunk_id: 2, imports: [] }),
    ]
    expect([...getInitialChunkIds(chunks)].sort()).toEqual([0, 1, 2])
  })

  it('returns no initial chunks without user-defined entries', () => {
    expect([...getInitialChunkIds([])]).toEqual([])
    expect([...getInitialChunkIds([chunk({ chunk_id: 0 })])]).toEqual([])
  })

  it('recomputes initial flags when restoring an older snapshot', () => {
    const chunks = [
      chunk({ chunk_id: 0, is_user_defined_entry: true, imports: [{ chunk_id: 1, kind: 'import-statement' }, { chunk_id: 2, kind: 'dynamic-import' }] }),
      chunk({ chunk_id: 1, imports: [] }),
      chunk({ chunk_id: 2, imports: [{ chunk_id: 3, kind: 'import-statement' }] }),
      chunk({ chunk_id: 3, imports: [] }),
    ]
    const manager = new RolldownEventsManager()
    const snapshot = manager.snapshot()
    snapshot.chunks = chunks.map(chunk => [chunk.chunk_id, { ...chunk, is_initial: true }])
    manager.restore(snapshot)
    expect([...manager.chunks.values()].filter(chunk => chunk.is_initial).map(chunk => chunk.chunk_id).sort()).toEqual([0, 1])
  })
})
