import type { DevToolsNodeContext } from 'devframe/types'
import { describe, expect, it, vi } from 'vitest'
import { DevToolsLogsHost } from '../host-logs'

describe('devToolsLogsHost', () => {
  const mockContext = {} as DevToolsNodeContext

  function createHost() {
    return new DevToolsLogsHost(mockContext)
  }

  describe('add()', () => {
    it('should add a log entry with auto-generated id and timestamp', async () => {
      const host = createHost()
      const handle = await host.add({ message: 'test', level: 'info' })

      expect(handle.id).toBeDefined()
      expect(handle.entry.message).toBe('test')
      expect(handle.entry.level).toBe('info')
      expect(handle.entry.timestamp).toBeTypeOf('number')
      expect(handle.entry.from).toBe('server')
      expect(host.entries.size).toBe(1)
    })

    it('should use provided id and timestamp', async () => {
      const host = createHost()
      const handle = await host.add({ id: 'my-id', message: 'test', level: 'warn', timestamp: 12345 })

      expect(handle.id).toBe('my-id')
      expect(handle.entry.timestamp).toBe(12345)
    })

    it('should emit log:added event', async () => {
      const host = createHost()
      const handler = vi.fn()
      host.events.on('log:added', handler)

      const handle = await host.add({ message: 'test', level: 'info' })

      expect(handler).toHaveBeenCalledWith(handle.entry)
    })

    it('should dedup by id — delegates to update() if id exists', async () => {
      const host = createHost()
      await host.add({ id: 'dup', message: 'first', level: 'info' })
      const handle = await host.add({ id: 'dup', message: 'second', level: 'warn' })

      expect(host.entries.size).toBe(1)
      expect(handle.entry.message).toBe('second')
      expect(handle.entry.level).toBe('warn')
      // Preserves original id, source, timestamp
      expect(handle.id).toBe('dup')
      expect(handle.entry.from).toBe('server')
    })

    it('should evict oldest entry when at capacity', async () => {
      const host = createHost()
      // Add 1000 entries (MAX_ENTRIES)
      for (let i = 0; i < 1000; i++)
        await host.add({ id: `entry-${i}`, message: `msg ${i}`, level: 'info' })

      expect(host.entries.size).toBe(1000)
      expect(host.entries.has('entry-0')).toBe(true)

      // Adding one more should evict the first
      await host.add({ id: 'overflow', message: 'overflow', level: 'info' })
      expect(host.entries.size).toBe(1000)
      expect(host.entries.has('entry-0')).toBe(false)
      expect(host.entries.has('overflow')).toBe(true)
    })
  })

  describe('update()', () => {
    it('should update an existing entry', async () => {
      const host = createHost()
      await host.add({ id: 'u1', message: 'original', level: 'info' })
      const updated = await host.update('u1', { message: 'changed', level: 'error' })

      expect(updated).toBeDefined()
      expect(updated!.message).toBe('changed')
      expect(updated!.level).toBe('error')
      // Preserved fields
      expect(updated!.id).toBe('u1')
      expect(updated!.from).toBe('server')
    })

    it('should return undefined for non-existent id', async () => {
      const host = createHost()
      expect(await host.update('nope', { message: 'x' })).toBeUndefined()
    })

    it('should emit log:updated event', async () => {
      const host = createHost()
      await host.add({ id: 'u2', message: 'a', level: 'info' })
      const handler = vi.fn()
      host.events.on('log:updated', handler)

      await host.update('u2', { message: 'b' })

      expect(handler).toHaveBeenCalledOnce()
      expect(handler.mock.calls[0]![0].message).toBe('b')
    })

    it('should preserve id, source, and timestamp on update', async () => {
      const host = createHost()
      const handle = await host.add({ id: 'u3', message: 'orig', level: 'info' })
      const original = handle.entry
      const updated = await host.update('u3', { message: 'new' })

      expect(updated!.id).toBe(original.id)
      expect(updated!.from).toBe(original.from)
      expect(updated!.timestamp).toBe(original.timestamp)
    })
  })

  describe('remove()', () => {
    it('should remove an entry', async () => {
      const host = createHost()
      await host.add({ id: 'r1', message: 'test', level: 'info' })
      await host.remove('r1')

      expect(host.entries.size).toBe(0)
    })

    it('should emit log:removed event', async () => {
      const host = createHost()
      await host.add({ id: 'r2', message: 'test', level: 'info' })
      const handler = vi.fn()
      host.events.on('log:removed', handler)

      await host.remove('r2')

      expect(handler).toHaveBeenCalledWith('r2')
    })
  })

  describe('clear()', () => {
    it('should remove all entries', async () => {
      const host = createHost()
      await host.add({ message: 'a', level: 'info' })
      await host.add({ message: 'b', level: 'warn' })
      await host.clear()

      expect(host.entries.size).toBe(0)
    })

    it('should emit log:cleared event', async () => {
      const host = createHost()
      await host.add({ message: 'a', level: 'info' })
      const handler = vi.fn()
      host.events.on('log:cleared', handler)

      await host.clear()

      expect(handler).toHaveBeenCalledOnce()
    })
  })

  describe('autoDelete', () => {
    it('should auto-delete entry after timeout', async () => {
      vi.useFakeTimers()
      const host = createHost()
      await host.add({ id: 'ad1', message: 'temp', level: 'info', autoDelete: 1000 })

      expect(host.entries.has('ad1')).toBe(true)
      vi.advanceTimersByTime(1000)
      expect(host.entries.has('ad1')).toBe(false)

      vi.useRealTimers()
    })

    it('should reset autoDelete timer on update', async () => {
      vi.useFakeTimers()
      const host = createHost()
      await host.add({ id: 'ad2', message: 'temp', level: 'info', autoDelete: 1000 })

      vi.advanceTimersByTime(500)
      await host.update('ad2', { autoDelete: 2000 })

      vi.advanceTimersByTime(500)
      expect(host.entries.has('ad2')).toBe(true)

      vi.advanceTimersByTime(1500)
      expect(host.entries.has('ad2')).toBe(false)

      vi.useRealTimers()
    })

    it('should clear autoDelete timer on remove', async () => {
      vi.useFakeTimers()
      const host = createHost()
      await host.add({ id: 'ad3', message: 'temp', level: 'info', autoDelete: 1000 })
      await host.remove('ad3')

      // Should not throw or re-remove after timer fires
      vi.advanceTimersByTime(1000)
      expect(host.entries.has('ad3')).toBe(false)

      vi.useRealTimers()
    })
  })

  describe('incremental versioning', () => {
    it('should track lastModified on add', async () => {
      const host = createHost()
      await host.add({ id: 'v1', message: 'a', level: 'info' })
      await host.add({ id: 'v2', message: 'b', level: 'info' })

      const mod1 = host.lastModified.get('v1')!
      const mod2 = host.lastModified.get('v2')!
      expect(mod1).toBeLessThan(mod2)
    })

    it('should update lastModified on update', async () => {
      const host = createHost()
      await host.add({ id: 'v3', message: 'a', level: 'info' })
      const modBefore = host.lastModified.get('v3')!

      await host.update('v3', { message: 'b' })
      const modAfter = host.lastModified.get('v3')!

      expect(modAfter).toBeGreaterThan(modBefore)
    })

    it('should remove lastModified on remove', async () => {
      const host = createHost()
      await host.add({ id: 'v4', message: 'a', level: 'info' })
      await host.remove('v4')

      expect(host.lastModified.has('v4')).toBe(false)
    })

    it('should track removals', async () => {
      const host = createHost()
      await host.add({ id: 'v5', message: 'a', level: 'info' })
      await host.add({ id: 'v6', message: 'b', level: 'info' })
      await host.remove('v5')

      expect(host.removals).toHaveLength(1)
      expect(host.removals[0]!.id).toBe('v5')
      expect(host.removals[0]!.time).toBeGreaterThan(0)
    })

    it('should track all removals on clear', async () => {
      const host = createHost()
      await host.add({ id: 'c1', message: 'a', level: 'info' })
      await host.add({ id: 'c2', message: 'b', level: 'info' })
      await host.clear()

      expect(host.removals).toHaveLength(2)
      const ids = host.removals.map(r => r.id)
      expect(ids).toContain('c1')
      expect(ids).toContain('c2')
    })

    it('should clear lastModified on clear', async () => {
      const host = createHost()
      await host.add({ id: 'c3', message: 'a', level: 'info' })
      await host.clear()

      expect(host.lastModified.size).toBe(0)
    })

    it('should allow filtering entries by version', async () => {
      const host = createHost()
      await host.add({ id: 'f1', message: 'a', level: 'info' })
      const versionAfterFirst = (host as any)._clock as number

      await host.add({ id: 'f2', message: 'b', level: 'info' })
      await host.update('f1', { message: 'a updated' })

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

    it('should allow filtering removals by version', async () => {
      const host = createHost()
      await host.add({ id: 'r1', message: 'a', level: 'info' })
      await host.add({ id: 'r2', message: 'b', level: 'info' })
      await host.remove('r1')
      const versionAfterRemove = (host as any)._clock as number

      await host.add({ id: 'r3', message: 'c', level: 'info' })
      await host.remove('r2')

      // Removals after versionAfterRemove
      const removedSince = host.removals
        .filter(r => r.time > versionAfterRemove)
        .map(r => r.id)

      expect(removedSince).toEqual(['r2'])
    })
  })

  describe('handle', () => {
    it('should return a handle with live entry', async () => {
      const host = createHost()
      const handle = await host.add({ id: 'h1', message: 'initial', level: 'info' })

      expect(handle.id).toBe('h1')
      expect(handle.entry.message).toBe('initial')

      // Update via handle
      await handle.update({ message: 'updated' })
      expect(handle.entry.message).toBe('updated')
    })

    it('should dismiss via handle', async () => {
      const host = createHost()
      const handle = await host.add({ id: 'h2', message: 'temp', level: 'info' })

      await handle.dismiss()
      expect(host.entries.has('h2')).toBe(false)
    })
  })
})
