import { describe, expect, it } from 'vitest'
import { createHmrTracker } from '../tracker'

describe('createHmrTracker', () => {
  it('should store updates newest first', () => {
    const tracker = createHmrTracker()

    tracker.record({ timestamp: 1000, type: 'update', files: ['a.ts'], modules: [] })
    tracker.record({ timestamp: 2000, type: 'update', files: ['b.ts'], modules: [] })

    const updates = tracker.getUpdates()
    expect(updates).toHaveLength(2)
    expect(updates[0]?.files[0]).toBe('b.ts')
    expect(updates[1]?.files[0]).toBe('a.ts')
  })

  it('should evict oldest entries when exceeding max history', () => {
    const tracker = createHmrTracker()

    for (let i = 0; i < 210; i++) {
      tracker.record({ timestamp: i, type: 'update', files: [`file-${i}.ts`], modules: [] })
    }

    const updates = tracker.getUpdates()
    expect(updates).toHaveLength(200)
    expect(updates[0]?.files[0]).toBe('file-209.ts')
    expect(updates[199]?.files[0]).toBe('file-10.ts')
  })

  it('should clear all updates', () => {
    const tracker = createHmrTracker()

    tracker.record({ timestamp: 1000, type: 'update', files: ['a.ts'], modules: [] })
    tracker.record({ timestamp: 2000, type: 'update', files: ['b.ts'], modules: [] })

    tracker.clear()
    expect(tracker.getUpdates()).toHaveLength(0)
  })
})
