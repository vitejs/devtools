import type { Stats } from 'node:fs'
import fs from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RolldownEventsReader } from '../events-reader'

const created: RolldownEventsReader[] = []
const MiB = 1024 * 1024

function reader(name: string, bytes = 0) {
  const result = RolldownEventsReader.get(`/mock/${name}/logs.json`)
  result.logBytes = bytes
  created.push(result)
  return result
}

afterEach(() => {
  for (const item of created)
    item.dispose()
  created.length = 0
  vi.restoreAllMocks()
})

describe('rolldown reader cache', () => {
  it('evicts the least recently used reader when the source byte budget is exceeded', () => {
    const first = reader('first', 100 * MiB)
    const second = reader('second', 100 * MiB)
    const third = reader('third', 100 * MiB)
    expect(RolldownEventsReader.get(first.filepath)).toBe(first)
    expect(RolldownEventsReader.peek(second.filepath)).toBeUndefined()
    expect(RolldownEventsReader.peek(third.filepath)).toBe(third)
  })

  it('retains one oversized current reader while evicting older idle readers', () => {
    const older = reader('older', MiB)
    const large = reader('large', 5 * 1024 * MiB)
    RolldownEventsReader.get(large.filepath)
    expect(RolldownEventsReader.peek(older.filepath)).toBeUndefined()
    expect(RolldownEventsReader.peek(large.filepath)).toBe(large)
  })

  it('keeps the count limit and preserves data still held by a caller', () => {
    const first = reader('first')
    first.manager.handleEvent({ action: 'BuildStart', timestamp: '1772529438599', session_id: '5173' })
    for (let i = 0; i < 32; i++)
      reader(`next-${i}`)
    expect(RolldownEventsReader.peek(first.filepath)).toBeUndefined()
    expect(first.manager.eventCount).toBe(1)
  })

  it('does not remove a replacement when an evicted reader is disposed', () => {
    const old = reader('same', 300 * MiB)
    reader('other')
    const replacement = reader('same')
    expect(replacement).not.toBe(old)
    old.dispose()
    expect(RolldownEventsReader.peek(old.filepath)).toBe(replacement)
  })

  it.each([
    ['read', 'restoreCompleteSession'],
    ['readSummary', 'restoreSummary'],
    ['readPackageSummary', 'restorePackageSummary'],
  ] as const)('accounts for source size when %s restores a disk cache', async (method, restore) => {
    const older = reader('older', MiB)
    const current = reader('current')
    vi.spyOn(fs.promises, 'stat').mockResolvedValue({ size: 300 * MiB, mtime: new Date(1) } as Stats)
    Object.defineProperty(current, 'logCache', {
      value: { [restore]: vi.fn().mockResolvedValue(true), resetCompleteSessionWriteAttempt: vi.fn(), resetPackageSummaryWriteAttempt: vi.fn() },
    })
    await current[method]()
    expect(current.logBytes).toBe(300 * MiB)
    expect(RolldownEventsReader.peek(older.filepath)).toBeUndefined()
    expect(RolldownEventsReader.peek(current.filepath)).toBe(current)
  })

  it.each(['read', 'readSummary', 'readPackageSummary'] as const)('protects a pending %s and prunes after it finishes', async (method) => {
    const pending = reader('pending', 300 * MiB)
    let finish!: () => void
    const completed = new Promise<void>((resolve) => {
      finish = resolve
    })
    const implementation = { read: 'readChanges', readSummary: 'readSummaryChanges', readPackageSummary: 'readPackageSummaryChanges' }[method]
    Object.defineProperty(pending, implementation, { value: () => completed })
    const reading = pending[method]()
    const idle = reader('idle', MiB)
    expect(RolldownEventsReader.peek(pending.filepath)).toBe(pending)
    expect(RolldownEventsReader.peek(idle.filepath)).toBe(idle)
    finish()
    await reading
    expect(RolldownEventsReader.peek(pending.filepath)).toBe(pending)
    expect(RolldownEventsReader.peek(idle.filepath)).toBeUndefined()
  })
})
