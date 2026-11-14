import type { ReaderIndex } from '../reader-index-codec'
import { Buffer } from 'node:buffer'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterEach, describe, expect, it } from 'vitest'
import { RolldownEventsReader } from '../events-reader'
import { decodeReaderIndex, encodeReaderIndex } from '../reader-index-codec'

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true })
})

function createIndex(): ReaderIndex {
  const location = (offset: number, length = 10) => ({ offset, length })
  return {
    lastBytes: 5 * 1024 ** 3,
    lastTimestamp: 1793700062071,
    moduleEventIndex: new Map([
      ['/src/ä/main.ts', {
        resolveIds: new Map([['r1', { start: location(0), end: location(10) }]]),
        loads: new Map(),
        // Offsets past 4 GiB must survive the round trip.
        transforms: new Map([['t1', { start: location(4.5 * 1024 ** 3), end: location(4.5 * 1024 ** 3 + 20, 300) }]]),
      }],
    ]),
    stringRefIndex: new Map([['ref-1', location(42, 7)]]),
    pendingHookCallStarts: new Map([
      ['p1', { module: '\0virtual', location: location(1) }],
      ['p2', { location: location(2) }],
    ]),
    assetsReadyLocations: [location(99, 3)],
  }
}

describe('reader index codec', () => {
  const stat = { size: 123, mtime: 456 }

  it('round-trips every index field', async () => {
    const index = createIndex()
    const decoded = await decodeReaderIndex(Buffer.concat(await encodeReaderIndex(index, stat)), stat)
    expect(decoded).toEqual(index)
  })

  it('rejects an index written for another log version', async () => {
    const buffer = Buffer.concat(await encodeReaderIndex(createIndex(), stat))
    expect(await decodeReaderIndex(buffer, { size: 124, mtime: 456 })).toBeUndefined()
    expect(await decodeReaderIndex(buffer, { size: 123, mtime: 457 })).toBeUndefined()
  })

  it('rejects truncated or padded data', async () => {
    const buffer = Buffer.concat(await encodeReaderIndex(createIndex(), stat))
    expect(await decodeReaderIndex(buffer.subarray(0, buffer.length - 1), stat)).toBeUndefined()
    expect(await decodeReaderIndex(Buffer.concat([buffer, Buffer.from([0])]), stat)).toBeUndefined()
  })
})

describe('rolldown log cache', () => {
  function writeLog(finalContent = 'b', sourceContent = 'aa') {
    const dir = mkdtempSync(join(tmpdir(), 'rolldown-log-cache-'))
    dirs.push(dir)
    const base = { build_id: 'bid_1', session_id: 'sid_1' }
    const lines = [
      { timestamp: 1, action: 'BuildStart', ...base },
      { timestamp: 2, action: 'HookResolveIdCallStart', importer: null, module_request: '/src/main.ts', import_kind: 'import-statement', plugin_name: 'p', plugin_id: 0, trigger: 'automatic', call_id: 'c1', ...base },
      { timestamp: 3, action: 'HookResolveIdCallEnd', resolved_id: '/src/main.ts', is_external: false, plugin_name: 'p', plugin_id: 0, trigger: 'automatic', call_id: 'c1', ...base },
      { timestamp: 3.2, action: 'HookTransformCallStart', module_id: '/src/main.ts', content: sourceContent, plugin_name: 'first', plugin_id: 1, trigger: 'automatic', call_id: 'first', ...base },
      { timestamp: 3.3, action: 'HookTransformCallEnd', module_id: '/src/main.ts', content: 'a', plugin_name: 'first', plugin_id: 1, trigger: 'automatic', call_id: 'first', ...base },
      { timestamp: 4, action: 'HookTransformCallStart', module_id: '/src/main.ts', content: 'a', plugin_name: 'p', plugin_id: 0, trigger: 'automatic', call_id: 'c2', ...base },
      { timestamp: 5, action: 'HookTransformCallEnd', module_id: '/src/main.ts', content: finalContent, plugin_name: 'p', plugin_id: 0, trigger: 'automatic', call_id: 'c2', ...base },
      { timestamp: 6, action: 'BuildEnd', ...base },
    ]
    const filepath = join(dir, 'logs.json')
    writeFileSync(filepath, `${lines.map(line => JSON.stringify(line)).join('\n')}\n`)
    return filepath
  }

  const indexOf = (reader: RolldownEventsReader) => {
    const state = reader as unknown as Record<string, unknown>
    return [state.moduleEventIndex, state.stringRefIndex, state.pendingHookCallStarts, state.assetsReadyLocations]
  }

  it.each([['aa', 'b'], ['aa', ''], ['a', 'a']])('preserves sizes from %j to %j through summary, full and detail cache reads', async (source, content) => {
    const filepath = writeLog(content, source)
    const cold = RolldownEventsReader.get(filepath)
    await cold.read()
    expect((cold as unknown as { moduleEventIndex: Map<string, unknown> }).moduleEventIndex.size).toBeGreaterThan(0)
    const coldIndex = structuredClone(indexOf(cold))
    const coldEvents = cold.manager.eventCount
    const coldModules = cold.manager.module_build_metrics.size
    const coldMetrics = cold.manager.module_build_metrics.get('/src/main.ts')!
    expect(coldMetrics.transforms).toHaveLength(2)
    cold.dispose()

    const warm = RolldownEventsReader.get(filepath)
    try {
      await warm.readSummary()
      expect(warm.manager.eventCount).toBe(coldEvents)
      expect((warm as unknown as { moduleEventIndex: Map<string, unknown> }).moduleEventIndex.size).toBe(0)
      // The summary keeps the compacted metrics the module list and chunk sizes rely on.
      const warmMetrics = warm.manager.module_build_metrics.get('/src/main.ts')
      expect(warm.manager.module_build_metrics.size).toBe(coldModules)
      expect(warmMetrics?.transforms[0]?.source_code_size).toBe(source.length)
      expect(warmMetrics?.transforms.at(-1)?.transformed_code_size).toBe(coldMetrics.transforms.at(-1)!.transformed_code_size)
      expect(warmMetrics?.resolve_ids[0]?.duration).toBe(coldMetrics.resolve_ids[0]!.duration)

      await warm.read()
      expect(indexOf(warm)).toEqual(coldIndex)
      expect(warm.manager.eventCount).toBe(coldEvents)
      const detail = await warm.readModuleBuildMetrics('/src/main.ts')
      expect(detail.transforms.at(-1)?.transformed_code_size).toBe(content.length)
    }
    finally {
      warm.dispose()
    }
  })
})
