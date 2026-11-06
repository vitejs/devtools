import type { Event } from '@rolldown/debug'
import { describe, expect, it } from 'vitest'
import { createPluginBuildMetricsSummary, RolldownEventsManager } from '../events-manager'
import { stringifyInSlices } from '../log-cache'

const base = { build_id: 'bid_1', session_id: 'sid_1' }

function hookCalls(callId: string, pluginId: number, module: string, time: number): Record<string, unknown>[] {
  const plugin = { plugin_name: `plugin-${pluginId}`, plugin_id: pluginId, trigger: 'automatic', ...base }
  return [
    { timestamp: time, action: 'HookResolveIdCallStart', importer: null, module_request: module, import_kind: 'import-statement', call_id: `${callId}-r`, ...plugin },
    { timestamp: time + 1, action: 'HookResolveIdCallEnd', resolved_id: module, is_external: false, call_id: `${callId}-r`, ...plugin },
    { timestamp: time + 2, action: 'HookLoadCallStart', module_id: module, call_id: `${callId}-l`, ...plugin },
    { timestamp: time + 5, action: 'HookLoadCallEnd', module_id: module, content: null, call_id: `${callId}-l`, ...plugin },
    { timestamp: time + 6, action: 'HookTransformCallStart', module_id: module, content: 'a', call_id: `${callId}-t`, ...plugin },
    { timestamp: time + 9, action: 'HookTransformCallEnd', module_id: module, content: 'bb', call_id: `${callId}-t`, ...plugin },
  ]
}

function expectSummariesMatchCalls(manager: RolldownEventsManager) {
  expect(manager.plugin_build_metrics.size).toBeGreaterThan(0)
  const expected = new Map(Array.from(manager.plugin_build_metrics, ([id, metrics]) => [id, createPluginBuildMetricsSummary(metrics)]))
  expect(manager.plugin_build_summaries).toEqual(expected)
}

describe('plugin summaries accumulated while parsing', () => {
  it('match summaries computed from the recorded calls, also after a restore', () => {
    const manager = new RolldownEventsManager()
    const events = [
      { timestamp: 1, action: 'BuildStart', ...base },
      ...hookCalls('a', 1, '/src/a.ts', 10),
      ...hookCalls('b', 2, '/src/b.ts', 20),
      ...hookCalls('c', 1, '/src/c.ts', 40),
      // An end without a matching start isn't recorded, so it must not be counted either.
      { timestamp: 60, action: 'HookTransformCallEnd', module_id: '/src/a.ts', content: 'x', call_id: 'missing', plugin_name: 'plugin-1', plugin_id: 1, trigger: 'automatic', ...base },
    ]
    for (const event of events)
      manager.handleEvent(event as unknown as Event)

    expectSummariesMatchCalls(manager)
    expect(manager.plugin_build_summaries.get(1)!.total.count).toBe(6)

    // Restoring a snapshot (package summary cache) rebuilds the summaries.
    const restored = new RolldownEventsManager()
    restored.restore(manager.snapshot())
    expect(restored.plugin_build_summaries).toEqual(manager.plugin_build_summaries)
  })
})

describe('sliced cache serialization', () => {
  it('produces the same JSON as JSON.stringify', async () => {
    const large = Array.from({ length: 1100 }, (_, index) => index % 7 === 0
      ? undefined
      : {
          id: `m${index} "quoted" \u2028 ä`,
          skipped: undefined,
          nested: index % 5 ? [index, null, undefined, { deep: [1, 2] }] : Array.from({ length: 1100 }, (_, i) => i),
          fn: () => index,
          // eslint-disable-next-line no-new-wrappers, unicorn/new-for-builtins
          boxed: new String(`s${index}`),
          date: new Date(index),
        })
    const value = { version: 3, log: { size: 1, mtime: 2 }, data: { metrics: large, empty: [], text: 'x' }, missing: undefined }

    expect((await stringifyInSlices(value)).join('')).toBe(JSON.stringify(value))
  })
})
