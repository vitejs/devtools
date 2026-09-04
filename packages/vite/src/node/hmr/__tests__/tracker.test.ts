import { describe, expect, it } from 'vitest'
import { createHmrTracker } from '../tracker'

function update(overrides = {}) {
  return {
    timestamp: 1000,
    type: 'update' as const,
    files: ['a.ts'],
    modules: [],
    boundaries: [],
    graph: { nodes: [], edges: [] },
    ...overrides,
  }
}

describe('createHmrTracker', () => {
  it('should store updates newest first', () => {
    const tracker = createHmrTracker()

    tracker.record(update({ files: ['a.ts'] }))
    tracker.record(update({ timestamp: 2000, files: ['b.ts'], boundaries: ['b.ts'] }))

    const updates = tracker.getUpdates()
    expect(updates).toHaveLength(2)
    expect(updates[0]?.files[0]).toBe('b.ts')
    expect(updates[0]?.boundaries).toEqual(['b.ts'])
    expect(updates[1]?.files[0]).toBe('a.ts')
  })

  it('should evict oldest entries when exceeding max history', () => {
    const tracker = createHmrTracker()

    for (let i = 0; i < 210; i++) {
      tracker.record(update({ timestamp: i, files: [`file-${i}.ts`] }))
    }

    const updates = tracker.getUpdates()
    expect(updates).toHaveLength(200)
    expect(updates[0]?.files[0]).toBe('file-209.ts')
    expect(updates[199]?.files[0]).toBe('file-10.ts')
  })

  it('should clear all updates', () => {
    const tracker = createHmrTracker()

    tracker.record(update())
    tracker.record(update({ timestamp: 2000, files: ['b.ts'] }))

    tracker.clear()
    expect(tracker.getUpdates()).toHaveLength(0)
  })
})
