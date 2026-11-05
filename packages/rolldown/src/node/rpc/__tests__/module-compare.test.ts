import { afterEach, describe, expect, it, vi } from 'vitest'
import { RolldownEventsReader } from '../../rolldown/events-reader'
import { rolldownGetSessionCompareDetails } from '../functions/rolldown-get-session-compare-details'

const { manager } = vi.hoisted(() => ({ manager: { loadAssetSession: vi.fn() } }))
vi.mock('../utils', () => ({ getLogsManager: () => manager }))

const readers: RolldownEventsReader[] = []
afterEach(() => {
  readers.splice(0).forEach(reader => reader.dispose())
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

function fixture(session: string, sizes: Record<string, number | null>) {
  const reader = RolldownEventsReader.get(`/module-compare-test/${session}/logs.json`)
  readers.push(reader)
  vi.spyOn(reader, 'readPluginBuildMetricsSummary').mockResolvedValue(new Map())
  reader.manager.chunks.set(0, { chunk_id: 0, name: 'main', imports: [], modules: Object.keys(sizes) } as any)
  for (const [id, size] of Object.entries(sizes)) {
    reader.manager.modules.set(id, {
      id,
      imports: [],
      importers: [],
      build_metrics: { resolve_ids: [], loads: [], transforms: size == null ? [] : [{ transformed_code_size: size }] },
    } as any)
  }
  return reader
}

describe('module comparison RPC', () => {
  it('preserves presence, missing metrics and measured zero through JSON transport', async () => {
    const a = fixture('a', { unknown: null, zero: 0, stable: 12, removed: 9, removedUnknown: null })
    const b = fixture('b', { unknown: 42, zero: 42, stable: 12, added: 9, addedUnknown: null })
    manager.loadAssetSession.mockImplementation(async id => id === 'a' ? a : b)
    const { handler } = await rolldownGetSessionCompareDetails.setup!({ cwd: '/' } as any)
    const result = JSON.parse(JSON.stringify(await handler!({ sessions: ['a', 'b'] })))
    const byId = Object.fromEntries(result.modules.map((item: any) => [item.key, item]))
    expect(byId.unknown).toMatchObject({ status: 'unavailable', previous: null, current: 42, delta: null })
    expect(byId.zero).toMatchObject({ status: 'changed', previous: 0, current: 42, delta: 42 })
    expect(byId.added.previousId).toBeUndefined()
    expect(byId.removed.currentId).toBeUndefined()
    expect(byId.stable).toMatchObject({ status: 'unchanged', delta: 0 })
    expect(byId.added).toMatchObject({ status: 'added', delta: 9 })
    expect(byId.removed).toMatchObject({ status: 'removed', delta: -9 })
    expect(byId.addedUnknown).toMatchObject({ status: 'added', current: null, delta: null })
    expect(byId.removedUnknown).toMatchObject({ status: 'removed', previous: null, delta: null })
    expect(result.modules.slice(-3).map((item: any) => item.key).sort()).toEqual(['addedUnknown', 'removedUnknown', 'unknown'])
  })
})
