import type { RolldownEventsReader } from '@vitejs/devtools-rolldown/node'
import { describe, expect, it } from 'vitest'
import { traceDependency } from '../dependency-trace'

function reader(edges: Record<string, string[]>, entry = 'entry') {
  const modules = new Map(Object.entries(edges).map(([id, importers]) => [id, { id, importers, imports: [] }]))
  for (const [id, node] of modules) {
    for (const importer of node.importers)
      (modules.get(importer)?.imports as { module_id: string }[] | undefined)?.push({ module_id: id })
  }
  return {
    meta: { inputs: [{ filename: entry }] },
    manager: {
      modules,
      chunks: new Map([[0, { chunk_id: 0, is_entry: true, entry_module: entry, modules: [...modules.keys()] }]]),
      assets: new Map([['app.js', { chunk_id: 0 }]]),
      packageGraphReady: false,
    },
  } as unknown as RolldownEventsReader
}

const input = { target: { type: 'module' as const, id: 'dep' }, direction: 'importers' as const, maxDepth: 8, limit: 5 }

describe('dependency graph evidence', () => {
  it('orders importer paths from entry to target', () => {
    const result = traceDependency(reader({ dep: ['middle'], middle: ['entry'], entry: [] }), input)
    expect(result.paths).toEqual([{ modules: ['entry', 'middle', 'dep'], end: 'entry' }])
    expect(result.truncated).toBe(false)
  })

  it('distinguishes depth limits, cycles and missing graph boundaries', () => {
    const graph = reader({ dep: ['middle'], middle: ['entry'], entry: [] })
    expect(traceDependency(graph, { ...input, maxDepth: 1 })).toMatchObject({ truncated: true, paths: [{ modules: ['middle', 'dep'], end: 'depth-limit' }] })
    expect(traceDependency(reader({ dep: ['middle'], middle: ['dep'] }), input).paths[0]?.end).toBe('cycle')
    expect(traceDependency(reader({ dep: ['external'] }), input).paths[0]?.end).toBe('missing-node')
    expect(traceDependency(reader({ dep: [] }), input).paths[0]?.end).toBe('root')
  })

  it('follows imports and exposes omitted branches', () => {
    const graph = reader({ entry: [], dep: ['entry'], another: ['entry'] })
    const result = traceDependency(graph, { ...input, target: { type: 'module', id: 'entry' }, direction: 'imports', limit: 1 })
    expect(result.paths).toEqual([{ modules: ['entry', 'dep'], end: 'root' }])
    expect(result.truncated).toBe(true)
  })

  it('bounds the traversal frontier of a high-fanout graph', () => {
    const imports = Array.from({ length: 10000 }, (_, i) => `parent-${i}`)
    const result = traceDependency(reader({ dep: imports }), input)
    expect(result.paths).toHaveLength(5)
    expect(result.edgesVisited).toBeLessThanOrEqual(1000)
    expect(result.truncated).toBe(true)
  })

  it('does not equate unavailable package data with a missing dependency', () => {
    const result = traceDependency(reader({ dep: [] }), { ...input, target: { type: 'package', id: 'dep' } })
    expect(result.packageGraphSupported).toBe(false)
    expect(result.notes).toContain('Package graph data is unavailable; package absence cannot be inferred.')
  })
})
