import type { RolldownChunkInfo } from '../../../shared/types'
import { describe, expect, it } from 'vitest'
import { getInitialChunkIds } from '../chunk'

function chunk(chunk_id: number, imports: [number, string][] = [], is_user_defined_entry = false) {
  return { chunk_id, is_user_defined_entry, imports: imports.map(([chunk_id, kind]) => ({ chunk_id, kind })) } as unknown as RolldownChunkInfo
}

describe('getInitialChunkIds', () => {
  it('follows static imports from user-defined entries and stops at dynamic imports', () => {
    const ids = getInitialChunkIds([
      chunk(0, [[1, 'import-statement'], [2, 'dynamic-import']], true),
      chunk(1, [[3, 'import-statement']]),
      chunk(2, [[4, 'import-statement']]),
      chunk(3),
      chunk(4),
    ])
    expect([...ids].sort()).toEqual([0, 1, 3])
  })

  it('keeps a chunk initial when it is reachable both statically and dynamically', () => {
    const ids = getInitialChunkIds([
      chunk(0, [[1, 'dynamic-import'], [2, 'import-statement']], true),
      chunk(1, [[2, 'import-statement']]),
      chunk(2, [[1, 'import-statement']]),
    ])
    expect([...ids].sort()).toEqual([0, 1, 2])
  })
})
