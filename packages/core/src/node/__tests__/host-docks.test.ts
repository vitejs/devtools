import type { DevToolsDockUserEntry, DevToolsNodeContext } from '@vitejs/devtools-kit'
import { describe, expect, it } from 'vitest'
import { DevToolsDockHost } from '../host-docks'

describe('devToolsDockHost', () => {
  const mockContext = {} as DevToolsNodeContext

  describe('register() collision detection', () => {
    it('should register a new dock successfully', () => {
      const host = new DevToolsDockHost(mockContext)
      const dock: DevToolsDockUserEntry = {
        type: 'iframe',
        id: 'test-dock',
        title: 'Test Dock',
        icon: 'test-icon',
        url: 'http://localhost:3000',
      }

      expect(() => host.register(dock)).not.toThrow()
      expect(host.views.has('test-dock')).toBe(true)
    })

    it('should throw error when registering duplicate dock ID', () => {
      const host = new DevToolsDockHost(mockContext)
      const dock1: DevToolsDockUserEntry = {
        type: 'iframe',
        id: 'duplicate-dock',
        title: 'First Dock',
        icon: 'icon1',
        url: 'http://localhost:3001',
      }
      const dock2: DevToolsDockUserEntry = {
        type: 'iframe',
        id: 'duplicate-dock',
        title: 'Second Dock',
        icon: 'icon2',
        url: 'http://localhost:3002',
      }

      host.register(dock1)

      expect(() => host.register(dock2)).toThrow()
      expect(() => host.register(dock2)).toThrow('duplicate-dock')
      expect(() => host.register(dock2)).toThrow('already registered')
    })

    it('should include the duplicate ID in error message', () => {
      const host = new DevToolsDockHost(mockContext)
      const dock: DevToolsDockUserEntry = {
        type: 'custom-render',
        id: 'my-special-panel',
        title: 'Special Panel',
        icon: 'special',
        renderer: {
          importFrom: './component.js',
          importName: 'MyComponent',
        },
      }

      host.register(dock)

      expect(() => host.register(dock)).toThrow('my-special-panel')
    })

    it('should allow different dock IDs', () => {
      const host = new DevToolsDockHost(mockContext)

      host.register({
        type: 'iframe',
        id: 'dock-1',
        title: 'Dock 1',
        icon: 'icon1',
        url: 'http://localhost:3001',
      })

      host.register({
        type: 'iframe',
        id: 'dock-2',
        title: 'Dock 2',
        icon: 'icon2',
        url: 'http://localhost:3002',
      })

      expect(host.views.size).toBe(2)
    })
  })

  describe('update() existence validation', () => {
    it('should throw error when updating non-existent dock', () => {
      const host = new DevToolsDockHost(mockContext)
      const dock: DevToolsDockUserEntry = {
        type: 'iframe',
        id: 'nonexistent',
        title: 'Does Not Exist',
        icon: 'icon',
        url: 'http://localhost:3000',
      }

      expect(() => host.update(dock)).toThrow()
      expect(() => host.update(dock)).toThrow('nonexistent')
      expect(() => host.update(dock)).toThrow('not registered')
      expect(() => host.update(dock)).toThrow('Use register()')
    })

    it('should update existing dock successfully', () => {
      const host = new DevToolsDockHost(mockContext)
      const dock1: DevToolsDockUserEntry = {
        type: 'iframe',
        id: 'update-test',
        title: 'Original Title',
        icon: 'original',
        url: 'http://localhost:3001',
      }
      const dock2: DevToolsDockUserEntry = {
        type: 'iframe',
        id: 'update-test',
        title: 'Updated Title',
        icon: 'updated',
        url: 'http://localhost:3002',
      }

      host.register(dock1)
      expect(() => host.update(dock2)).not.toThrow()

      const updated = host.views.get('update-test')
      expect(updated?.title).toBe('Updated Title')
      if (updated?.type === 'iframe') {
        expect(updated.url).toBe('http://localhost:3002')
      }
    })

    it('should validate that update only works on existing entries', () => {
      const host = new DevToolsDockHost(mockContext)

      // Register one dock
      host.register({
        type: 'iframe',
        id: 'exists',
        title: 'Exists',
        icon: 'icon',
        url: 'http://localhost:3000',
      })

      // Update should work for existing
      expect(() =>
        host.update({
          type: 'iframe',
          id: 'exists',
          title: 'Updated',
          icon: 'icon',
          url: 'http://localhost:3001',
        }),
      ).not.toThrow()

      // Update should fail for non-existing
      expect(() =>
        host.update({
          type: 'iframe',
          id: 'does-not-exist',
          title: 'Failed',
          icon: 'icon',
          url: 'http://localhost:3002',
        }),
      ).toThrow()
    })

    it('should preserve dock in values() after update', () => {
      const host = new DevToolsDockHost(mockContext)

      const { update } = host.register({
        type: 'iframe',
        id: 'test',
        title: 'Original',
        icon: 'icon',
        url: 'http://localhost:3000',
      })

      update({
        title: 'Updated',
        icon: 'newicon',
        url: 'http://localhost:3001',
      })

      const docks = host.values()
      expect(docks.length).toBe(1)
      expect(docks[0]?.title).toBe('Updated')
    })
  })
})
