import type { Event } from '@rolldown/debug'
import { describe, expect, it, vi } from 'vitest'
import { RolldownEventsReader } from '../events-reader'

describe('rolldown events reader', () => {
  it('does not process the same log bytes twice during concurrent reads', async () => {
    const reader = RolldownEventsReader.get('/mock/logs.json')
    let resolveRead!: () => void
    const readComplete = new Promise<void>((resolve) => {
      resolveRead = resolve
    })
    const event = { action: 'BuildStart', timestamp: '1772529438599', session_id: '5173' } satisfies Event

    const readChanges = vi.fn(async () => {
      reader.manager.handleEvent(event)
      await readComplete
    })
    Object.defineProperty(reader, 'readChanges', { value: readChanges })

    try {
      const reads = [
        reader.read(),
        reader.read(),
        reader.read(),
      ]

      expect(readChanges).toHaveBeenCalledTimes(1)
      resolveRead()
      await Promise.all(reads)

      expect(reader.manager.eventCount).toBe(1)

      await reader.read()
      expect(readChanges).toHaveBeenCalledTimes(2)
    }
    finally {
      reader.dispose()
    }
  })
})

describe('plugin detail hydration', () => {
  it.each([
    ['many small calls', 513, () => 10],
    ['large calls', 17, () => 100_000],
    ['one oversized call', 5, (i: number) => i === 2 ? 2 * 1024 * 1024 : 10],
  ] as const)('bounds event reads for %s and preserves filtered, sorted metrics', async (_, count, size) => {
    const reader = RolldownEventsReader.get('/mock/plugin-batches/logs.json')
    const entries = Array.from({ length: count }, (_, i) => [String(i), {
      start: { offset: i * 2, length: size(i) },
      end: { offset: i * 2 + 1, length: size(i) },
    }] as const)
    const split = Math.ceil(count / 2)
    Object.defineProperty(reader, 'moduleEventIndex', { value: new Map([
      ['a.ts', { resolveIds: new Map(), loads: new Map(entries.slice(0, split)), transforms: new Map() }],
      ['b.ts', { resolveIds: new Map(), loads: new Map(entries.slice(split)), transforms: new Map() }],
    ]) })
    Object.defineProperty(reader, 'metricsSummaryOnly', { value: true })
    vi.spyOn(reader, 'read').mockResolvedValue()
    const read = vi.fn(async (locations: Array<{ offset: number, length: number }>) => {
      expect(locations.length).toBeLessThanOrEqual(256)
      if (locations.reduce((sum, location) => sum + location.length, 0) > 1024 * 1024)
        expect(locations).toHaveLength(2)
      return locations.map(({ offset }) => {
        const i = Math.floor(offset / 2)
        return offset % 2
          ? { action: 'HookLoadCallEnd', plugin_id: i % 2, plugin_name: `plugin-${i % 2}`, timestamp: 1000 - i, content: null }
          : { action: 'HookLoadCallStart', timestamp: 999 - i }
      })
    })
    Object.defineProperty(reader, 'readEventsAt', { value: read })
    try {
      await reader.hydratePluginBuildMetrics(1)
      const metrics = reader.manager.plugin_build_metrics.get(1)!
      const expectedIds = entries.map(([id]) => id).filter(id => Number(id) % 2).reverse()
      expect(metrics.calls.map(call => call.id)).toEqual(expectedIds)
      expect(metrics.calls[0]).toMatchObject({ module: 'b.ts', duration: 1, unchanged: true, plugin_id: 1 })
      expect(metrics.calls.at(-1)).toMatchObject({ module: 'a.ts', duration: 1, unchanged: true })
      expect(read.mock.calls.length).toBeGreaterThan(1)
      await reader.hydratePluginBuildMetrics(99)
      expect(reader.manager.plugin_build_metrics.has(99)).toBe(false)
    }
    finally {
      reader.dispose()
    }
  })

  it('compares transform content in batches without changing equality results', async () => {
    const reader = RolldownEventsReader.get('/mock/plugin-transforms/logs.json')
    const calls = Array.from({ length: 300 }, (_, i) => ({ type: 'transform' as const, id: String(i), module: 'a.ts', plugin_id: 1, plugin_name: 'test', duration: 1, timestamp_start: i, timestamp_end: i + 1 }))
    reader.manager.plugin_build_metrics.set(1, { plugin_id: 1, plugin_name: 'test', calls })
    vi.spyOn(reader, 'read').mockResolvedValue()
    Object.defineProperty(reader, 'moduleEventIndex', { value: new Map([
      ['a.ts', { transforms: new Map(calls.map((call, i) => [call.id, { start: { offset: i * 2, length: 10 }, end: { offset: i * 2 + 1, length: 10 } }])) }],
    ]) })
    const read = vi.fn(async (locations: Array<{ offset: number }>) => {
      expect(locations.length).toBeLessThanOrEqual(256)
      return locations.map(({ offset }) => ({
        action: offset % 2 ? 'HookTransformCallEnd' : 'HookTransformCallStart',
        content: offset % 4 === 3 ? 'changed' : 'original',
      }))
    })
    Object.defineProperty(reader, 'readEventsAt', { value: read })
    try {
      await reader.hydratePluginBuildMetrics(1)
      expect(reader.manager.plugin_build_metrics.get(1)!.calls.map(call => call.unchanged)).toEqual(calls.map((_, i) => i % 2 === 0))
      expect(read).toHaveBeenCalledTimes(3)
      await reader.hydratePluginBuildMetrics(1)
      expect(read).toHaveBeenCalledTimes(3)
    }
    finally {
      reader.dispose()
    }
  })

  it('resolves string references per transform batch and handles missing index entries', async () => {
    const reader = RolldownEventsReader.get('/mock/plugin-refs/logs.json')
    const calls = Array.from({ length: 260 }, (_, i) => ({ type: 'transform' as const, id: String(i), module: 'a.ts', plugin_id: 1, plugin_name: 'test', duration: 1, timestamp_start: i, timestamp_end: i + 1 }))
    reader.manager.plugin_build_metrics.set(1, { plugin_id: 1, plugin_name: 'test', calls })
    vi.spyOn(reader, 'read').mockResolvedValue()
    Object.defineProperty(reader, 'moduleEventIndex', { value: new Map([
      ['a.ts', { transforms: new Map(calls.slice(0, -1).map((call, i) => [call.id, { start: { offset: i * 2, length: 10 }, end: { offset: i * 2 + 1, length: 10 } }])) }],
    ]) })
    Object.defineProperty(reader, 'readEventsAt', { value: async (locations: Array<{ offset: number }>) => locations.map(({ offset }) => ({
      action: offset % 2 ? 'HookTransformCallEnd' : 'HookTransformCallStart',
      content: `$ref:${offset}`,
    })) })
    const readRefs = vi.fn(async (refs: Set<string>) => {
      expect(refs.size).toBeLessThanOrEqual(256)
      return new Map([...refs].map(ref => [ref, Number(ref) % 4 === 3 ? 'changed' : 'original']))
    })
    Object.defineProperty(reader, 'readStringRefs', { value: readRefs })
    try {
      await reader.hydratePluginBuildMetrics(1)
      expect(reader.manager.plugin_build_metrics.get(1)!.calls.map(call => call.unchanged)).toEqual(calls.map((_, i) => i < 259 && i % 2 === 0))
      expect(readRefs).toHaveBeenCalledTimes(3)
    }
    finally {
      reader.dispose()
    }
  })
})
