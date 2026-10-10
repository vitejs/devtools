import type { RolldownEventsReader } from '@vitejs/devtools-rolldown/node'
import { getPackageMeta } from '@vitejs/devtools-rolldown/node'
import { describe, expect, it } from 'vitest'
import { traceDependency } from '../dependency-trace'

const trace = (reader: RolldownEventsReader, input: Parameters<typeof traceDependency>[1]) => traceDependency(reader, input, getPackageMeta)

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
    const result = trace(reader({ dep: ['middle'], middle: ['entry'], entry: [] }), input)
    expect(result.paths).toEqual([{ modules: ['entry', 'middle', 'dep'], end: 'entry' }])
    expect(result.truncated).toBe(false)
  })

  it('distinguishes depth limits, cycles and missing graph boundaries', () => {
    const graph = reader({ dep: ['middle'], middle: ['entry'], entry: [] })
    expect(trace(graph, { ...input, maxDepth: 1 })).toMatchObject({ truncated: true, paths: [{ modules: ['middle', 'dep'], end: 'depth-limit' }] })
    expect(trace(reader({ dep: ['middle'], middle: ['dep'] }), input).paths[0]?.end).toBe('cycle')
    expect(trace(reader({ dep: ['external'] }), input).paths[0]?.end).toBe('missing-node')
    expect(trace(reader({ dep: [] }), input).paths[0]?.end).toBe('root')
  })

  it('follows imports and exposes omitted branches', () => {
    const graph = reader({ entry: [], dep: ['entry'], another: ['entry'] })
    const result = trace(graph, { ...input, target: { type: 'module', id: 'entry' }, direction: 'imports', limit: 1 })
    expect(result.paths).toEqual([{ modules: ['entry', 'dep'], end: 'root' }])
    expect(result.truncated).toBe(true)
  })

  it('bounds the traversal frontier of a high-fanout graph', () => {
    const imports = Array.from({ length: 10000 }, (_, i) => `parent-${i}`)
    const result = trace(reader({ dep: imports }), input)
    expect(result.paths).toHaveLength(5)
    expect(result.edgesVisited).toBeLessThanOrEqual(1000)
    expect(result.truncated).toBe(true)
  })

  it('does not equate unavailable package data with a missing dependency', () => {
    const result = trace(reader({ dep: [] }), { ...input, target: { type: 'package', id: 'dep' } })
    expect(result.packageGraphSupported).toBe(false)
    expect(result.notes).toContain('Package graph data is unavailable; package absence cannot be inferred.')
  })

  it('returns an entry path ahead of shorter graph boundaries', () => {
    const result = trace(reader({
      'dep': ['short-a', 'short-b', 'middle'],
      'short-a': [],
      'short-b': [],
      'middle': ['entry'],
      'entry': [],
    }), { ...input, limit: 1 })
    expect(result.paths).toEqual([{ modules: ['entry', 'middle', 'dep'], end: 'entry' }])
    expect(result.truncated).toBe(true)
  })

  it('explains an output file with no module graph', () => {
    const graph = reader({ dep: [] })
    graph.manager.assets.set('app.js.map', { filename: 'app.js.map', size: 10, chunk_id: null } as never)
    const result = trace(graph, { ...input, target: { type: 'asset', id: 'app.js.map' } })
    expect(result.targetFound).toBe(true)
    expect(result.matchedModules).toBe(0)
    expect(result.paths).toEqual([])
    expect(result.notes).toContain('This output file has no recorded module graph. Sourcemaps and other static files stop here.')
    const missing = trace(graph, { ...input, target: { type: 'asset', id: 'missing.js' } })
    expect(missing.targetFound).toBe(false)
    expect(missing.notes).not.toContain('This output file has no recorded module graph. Sourcemaps and other static files stop here.')
  })
})
