import type { DevToolsNodeContext } from '@vitejs/devtools-kit'
import { describe, expect, it, vi } from 'vitest'
import { DevToolsLogsHost } from '../host-logs'

describe('devToolsLogsHost', () => {
  const mockContext = {} as DevToolsNodeContext

  function createHost() {
    return new DevToolsLogsHost(mockContext)
  }

  describe('add()', () => {
    it('should add a log entry with auto-generated id and timestamp', () => {
      const host = createHost()
      const entry = host.add({ message: 'test', level: 'info' })

      expect(entry.id).toBeDefined()
      expect(entry.message).toBe('test')
      expect(entry.level).toBe('info')
      expect(entry.timestamp).toBeTypeOf('number')
      expect(entry.source).toBe('server')
      expect(host.entries.size).toBe(1)
    })

    it('should use provided id and timestamp', () => {
      const host = createHost()
      const entry = host.add({ id: 'my-id', message: 'test', level: 'warn', timestamp: 12345 })

      expect(entry.id).toBe('my-id')
      expect(entry.timestamp).toBe(12345)
    })

    it('should emit log:added event', () => {
      const host = createHost()
      const handler = vi.fn()
      host.events.on('log:added', handler)

      const entry = host.add({ message: 'test', level: 'info' })

      expect(handler).toHaveBeenCalledWith(entry)
    })

    it('should dedup by id — delegates to update() if id exists', () => {
      const host = createHost()
      host.add({ id: 'dup', message: 'first', level: 'info' })
      const updated = host.add({ id: 'dup', message: 'second', level: 'warn' })

      expect(host.entries.size).toBe(1)
      expect(updated.message).toBe('second')
      expect(updated.level).toBe('warn')
      // Preserves original id, source, timestamp
      expect(updated.id).toBe('dup')
      expect(updated.source).toBe('server')
    })

    it('should evict oldest entry when at capacity', () => {
      const host = createHost()
      // Add 1000 entries (MAX_ENTRIES)
      for (let i = 0; i < 1000; i++)
        host.add({ id: `entry-${i}`, message: `msg ${i}`, level: 'info' })

      expect(host.entries.size).toBe(1000)
      expect(host.entries.has('entry-0')).toBe(true)

      // Adding one more should evict the first
      host.add({ id: 'overflow', message: 'overflow', level: 'info' })
      expect(host.entries.size).toBe(1000)
      expect(host.entries.has('entry-0')).toBe(false)
      expect(host.entries.has('overflow')).toBe(true)
    })
  })

  describe('update()', () => {
    it('should update an existing entry', () => {
      const host = createHost()
      host.add({ id: 'u1', message: 'original', level: 'info' })
      const updated = host.update('u1', { message: 'changed', level: 'error' })

      expect(updated).toBeDefined()
      expect(updated!.message).toBe('changed')
      expect(updated!.level).toBe('error')
      // Preserved fields
      expect(updated!.id).toBe('u1')
      expect(updated!.source).toBe('server')
    })

    it('should return undefined for non-existent id', () => {
      const host = createHost()
      expect(host.update('nope', { message: 'x' })).toBeUndefined()
    })

    it('should emit log:updated event', () => {
      const host = createHost()
      host.add({ id: 'u2', message: 'a', level: 'info' })
      const handler = vi.fn()
      host.events.on('log:updated', handler)

      host.update('u2', { message: 'b' })

      expect(handler).toHaveBeenCalledOnce()
      expect(handler.mock.calls[0][0].message).toBe('b')
    })

    it('should preserve id, source, and timestamp on update', () => {
      const host = createHost()
      const original = host.add({ id: 'u3', message: 'orig', level: 'info' })
      const updated = host.update('u3', { message: 'new' })

      expect(updated!.id).toBe(original.id)
      expect(updated!.source).toBe(original.source)
      expect(updated!.timestamp).toBe(original.timestamp)
    })
  })

  describe('remove()', () => {
    it('should remove an entry', () => {
      const host = createHost()
      host.add({ id: 'r1', message: 'test', level: 'info' })
      host.remove('r1')

      expect(host.entries.size).toBe(0)
    })

    it('should emit log:removed event', () => {
      const host = createHost()
      host.add({ id: 'r2', message: 'test', level: 'info' })
      const handler = vi.fn()
      host.events.on('log:removed', handler)

      host.remove('r2')

      expect(handler).toHaveBeenCalledWith('r2')
    })
  })

  describe('clear()', () => {
    it('should remove all entries', () => {
      const host = createHost()
      host.add({ message: 'a', level: 'info' })
      host.add({ message: 'b', level: 'warn' })
      host.clear()

      expect(host.entries.size).toBe(0)
    })

    it('should emit log:cleared event', () => {
      const host = createHost()
      host.add({ message: 'a', level: 'info' })
      const handler = vi.fn()
      host.events.on('log:cleared', handler)

      host.clear()

      expect(handler).toHaveBeenCalledOnce()
    })
  })

  describe('autoDelete', () => {
    it('should auto-delete entry after timeout', () => {
      vi.useFakeTimers()
      const host = createHost()
      host.add({ id: 'ad1', message: 'temp', level: 'info', autoDelete: 1000 })

      expect(host.entries.has('ad1')).toBe(true)
      vi.advanceTimersByTime(1000)
      expect(host.entries.has('ad1')).toBe(false)

      vi.useRealTimers()
    })

    it('should reset autoDelete timer on update', () => {
      vi.useFakeTimers()
      const host = createHost()
      host.add({ id: 'ad2', message: 'temp', level: 'info', autoDelete: 1000 })

      vi.advanceTimersByTime(500)
      host.update('ad2', { autoDelete: 2000 })

      vi.advanceTimersByTime(500)
      expect(host.entries.has('ad2')).toBe(true)

      vi.advanceTimersByTime(1500)
      expect(host.entries.has('ad2')).toBe(false)

      vi.useRealTimers()
    })

    it('should clear autoDelete timer on remove', () => {
      vi.useFakeTimers()
      const host = createHost()
      host.add({ id: 'ad3', message: 'temp', level: 'info', autoDelete: 1000 })
      host.remove('ad3')

      // Should not throw or re-remove after timer fires
      vi.advanceTimersByTime(1000)
      expect(host.entries.has('ad3')).toBe(false)

      vi.useRealTimers()
    })
  })

  describe('incremental versioning', () => {
    it('should track lastModified on add', () => {
      const host = createHost()
      host.add({ id: 'v1', message: 'a', level: 'info' })
      host.add({ id: 'v2', message: 'b', level: 'info' })

      const mod1 = host.lastModified.get('v1')!
      const mod2 = host.lastModified.get('v2')!
      expect(mod1).toBeLessThan(mod2)
    })

    it('should update lastModified on update', () => {
      const host = createHost()
      host.add({ id: 'v3', message: 'a', level: 'info' })
      const modBefore = host.lastModified.get('v3')!

      host.update('v3', { message: 'b' })
      const modAfter = host.lastModified.get('v3')!

      expect(modAfter).toBeGreaterThan(modBefore)
    })

    it('should remove lastModified on remove', () => {
      const host = createHost()
      host.add({ id: 'v4', message: 'a', level: 'info' })
      host.remove('v4')

      expect(host.lastModified.has('v4')).toBe(false)
    })

    it('should track removals', () => {
      const host = createHost()
      host.add({ id: 'v5', message: 'a', level: 'info' })
      host.add({ id: 'v6', message: 'b', level: 'info' })
      host.remove('v5')

      expect(host.removals).toHaveLength(1)
      expect(host.removals[0].id).toBe('v5')
      expect(host.removals[0].time).toBeGreaterThan(0)
    })

    it('should track all removals on clear', () => {
      const host = createHost()
      host.add({ id: 'c1', message: 'a', level: 'info' })
      host.add({ id: 'c2', message: 'b', level: 'info' })
      host.clear()

      expect(host.removals).toHaveLength(2)
      const ids = host.removals.map(r => r.id)
      expect(ids).toContain('c1')
      expect(ids).toContain('c2')
    })

    it('should clear lastModified on clear', () => {
      const host = createHost()
      host.add({ id: 'c3', message: 'a', level: 'info' })
      host.clear()

      expect(host.lastModified.size).toBe(0)
    })

    it('should allow filtering entries by version', () => {
      const host = createHost()
      host.add({ id: 'f1', message: 'a', level: 'info' })
      const versionAfterFirst = (host as any)._clock as number

      host.add({ id: 'f2', message: 'b', level: 'info' })
      host.update('f1', { message: 'a updated' })

      // Entries modified after versionAfterFirst
      const modified: string[] = []
      for (const [id] of host.entries) {
        const mod = host.lastModified.get(id)
        if (mod != null && mod > versionAfterFirst)
          modified.push(id)
      }

      // Both f2 (added after) and f1 (updated after) should be included
      expect(modified).toContain('f1')
      expect(modified).toContain('f2')
    })

    it('should allow filtering removals by version', () => {
      const host = createHost()
      host.add({ id: 'r1', message: 'a', level: 'info' })
      host.add({ id: 'r2', message: 'b', level: 'info' })
      host.remove('r1')
      const versionAfterRemove = (host as any)._clock as number

      host.add({ id: 'r3', message: 'c', level: 'info' })
      host.remove('r2')

      // Removals after versionAfterRemove
      const removedSince = host.removals
        .filter(r => r.time > versionAfterRemove)
        .map(r => r.id)

      expect(removedSince).toEqual(['r2'])
    })
  })
})
