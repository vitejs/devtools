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
