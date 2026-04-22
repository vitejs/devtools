import type { DevToolsDockUserEntry, DevToolsNodeContext, DevToolsViewIframe, RemoteConnectionInfo } from '@vitejs/devtools-kit'
import { Buffer } from 'node:buffer'
import { REMOTE_CONNECTION_KEY } from '@vitejs/devtools-kit/constants'
import { describe, expect, it } from 'vitest'
import { getInternalContext, internalContextMap } from '../context-internal'
import { DevToolsDockHost } from '../host-docks'

function createMockContext(): DevToolsNodeContext {
  return {
    viteConfig: {
      server: { host: 'localhost', port: 5173, https: false },
    },
    viteServer: undefined,
    mode: 'dev',
    host: {
      mountStatic: () => {},
      resolveOrigin: () => 'http://localhost:5173',
    },
  } as unknown as DevToolsNodeContext
}

function decodeDescriptor(url: string): RemoteConnectionInfo {
  const match = url.match(new RegExp(`[#&?]${REMOTE_CONNECTION_KEY}=([^&]+)`))
  if (!match)
    throw new Error(`No descriptor in URL: ${url}`)
  const encoded = match[1]!
  const padLen = (4 - encoded.length % 4) % 4
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLen)
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'))
}

describe('devToolsDockHost', () => {
  const mockContext = {} as DevToolsNodeContext

  describe('builtin entries', () => {
    it('does not include popup in builtin docks', () => {
      const host = new DevToolsDockHost(mockContext)
      const builtinEntries = host.values().filter(entry => entry.type === '~builtin')
      const builtinIds = builtinEntries.map(entry => entry.id)

      expect(builtinIds).not.toContain('~popup')
    })
  })

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

      const docks = host.values({ includeBuiltin: false })
      expect(docks.length).toBe(1)
      expect(docks[0]?.title).toBe('Updated')
    })
  })

  describe('remote iframe docks', () => {
    it('allocates a session token and enriches URL with a fragment descriptor', () => {
      const ctx = createMockContext()
      const host = new DevToolsDockHost(ctx)
      const internal = getInternalContext(ctx)
      internal.wsEndpoint = { url: 'ws://localhost:7812' }

      host.register({
        type: 'iframe',
        id: 'remote-dock',
        title: 'Remote',
        icon: 'ph:globe-duotone',
        url: 'https://example.com/devtools',
        remote: true,
      })

      expect(internal.remoteTokens.size).toBe(1)

      const projected = host.values({ includeBuiltin: false })[0] as DevToolsViewIframe
      expect(projected.url).toContain('#')
      expect(projected.url).toContain(REMOTE_CONNECTION_KEY)
      expect(projected.url).not.toContain('?')

      const descriptor = decodeDescriptor(projected.url)
      expect(descriptor).toMatchObject({
        v: 1,
        backend: 'websocket',
        websocket: 'ws://localhost:7812',
        origin: 'http://localhost:5173',
      })
      expect(descriptor.authToken).toBeTruthy()

      // The token in the descriptor is exactly the one allocated by the registry.
      expect(internal.remoteTokens.has(descriptor.authToken)).toBe(true)
      internalContextMap.delete(ctx)
    })

    it('emits a query transport when transport=query is requested', () => {
      const ctx = createMockContext()
      const host = new DevToolsDockHost(ctx)
      getInternalContext(ctx).wsEndpoint = { url: 'ws://localhost:7812' }

      host.register({
        type: 'iframe',
        id: 'remote-dock',
        title: 'Remote',
        icon: 'ph:globe-duotone',
        url: 'https://example.com/devtools',
        remote: { transport: 'query' },
      })

      const projected = host.values({ includeBuiltin: false })[0] as DevToolsViewIframe
      expect(projected.url).toMatch(new RegExp(`\\?${REMOTE_CONNECTION_KEY}=`))
      expect(projected.url).not.toContain('#')
      internalContextMap.delete(ctx)
    })

    it('defaults `when` to hide the dock in build mode', () => {
      const ctx = createMockContext()
      const host = new DevToolsDockHost(ctx)
      getInternalContext(ctx).wsEndpoint = { url: 'ws://localhost:7812' }

      host.register({
        type: 'iframe',
        id: 'remote-dock',
        title: 'Remote',
        icon: 'ph:globe-duotone',
        url: 'https://example.com/devtools',
        remote: true,
      })

      expect(host.views.get('remote-dock')?.when).toBe('mode != build')
      internalContextMap.delete(ctx)
    })

    it('respects an explicit `when` clause from the author', () => {
      const ctx = createMockContext()
      const host = new DevToolsDockHost(ctx)
      getInternalContext(ctx).wsEndpoint = { url: 'ws://localhost:7812' }

      host.register({
        type: 'iframe',
        id: 'remote-dock',
        title: 'Remote',
        icon: 'ph:globe-duotone',
        url: 'https://example.com/devtools',
        remote: true,
        when: 'clientType == embedded',
      })

      expect(host.views.get('remote-dock')?.when).toBe('clientType == embedded')
      internalContextMap.delete(ctx)
    })

    it('revokes the prior token when the dock is force-re-registered', () => {
      const ctx = createMockContext()
      const host = new DevToolsDockHost(ctx)
      const internal = getInternalContext(ctx)
      internal.wsEndpoint = { url: 'ws://localhost:7812' }

      host.register({
        type: 'iframe',
        id: 'remote-dock',
        title: 'Remote',
        icon: 'ph:globe-duotone',
        url: 'https://example.com/v1',
        remote: true,
      })
      const firstToken = [...internal.remoteTokens.keys()][0]!

      host.register({
        type: 'iframe',
        id: 'remote-dock',
        title: 'Remote',
        icon: 'ph:globe-duotone',
        url: 'https://example.com/v2',
        remote: true,
      }, true)

      expect(internal.remoteTokens.has(firstToken)).toBe(false)
      expect(internal.remoteTokens.size).toBe(1)
      internalContextMap.delete(ctx)
    })

    it('leaves non-remote iframe URLs untouched', () => {
      const ctx = createMockContext()
      const host = new DevToolsDockHost(ctx)
      getInternalContext(ctx).wsEndpoint = { url: 'ws://localhost:7812' }

      host.register({
        type: 'iframe',
        id: 'plain-dock',
        title: 'Plain',
        icon: 'ph:app-window-duotone',
        url: '/.devtools-plain/',
      })

      const projected = host.values({ includeBuiltin: false })[0] as DevToolsViewIframe
      expect(projected.url).toBe('/.devtools-plain/')
      internalContextMap.delete(ctx)
    })

    it('returns non-enriched URL before the WS endpoint is known', () => {
      const ctx = createMockContext()
      const host = new DevToolsDockHost(ctx)
      // Note: wsEndpoint intentionally NOT set.

      host.register({
        type: 'iframe',
        id: 'remote-dock',
        title: 'Remote',
        icon: 'ph:globe-duotone',
        url: 'https://example.com/devtools',
        remote: true,
      })

      const projected = host.values({ includeBuiltin: false })[0] as DevToolsViewIframe
      expect(projected.url).toBe('https://example.com/devtools')
      internalContextMap.delete(ctx)
    })
  })

  describe('remote token trust', () => {
    it('trusts a token when origin matches (originLock on)', () => {
      const ctx = createMockContext()
      const internal = getInternalContext(ctx)

      const token = internal.allocateRemoteToken('dock-a', 'https://example.com', true)
      expect(internal.isRemoteTokenTrusted(token, 'https://example.com')).toBe(true)
      expect(internal.isRemoteTokenTrusted(token, 'https://attacker.com')).toBe(false)
      expect(internal.isRemoteTokenTrusted(token, undefined)).toBe(false)
      internalContextMap.delete(ctx)
    })

    it('trusts a token regardless of origin when originLock is off', () => {
      const ctx = createMockContext()
      const internal = getInternalContext(ctx)

      const token = internal.allocateRemoteToken('dock-a', 'https://example.com', false)
      expect(internal.isRemoteTokenTrusted(token, 'https://example.com')).toBe(true)
      expect(internal.isRemoteTokenTrusted(token, 'https://another.com')).toBe(true)
      expect(internal.isRemoteTokenTrusted(token, undefined)).toBe(true)
      internalContextMap.delete(ctx)
    })

    it('rejects tokens after revocation', () => {
      const ctx = createMockContext()
      const internal = getInternalContext(ctx)

      const token = internal.allocateRemoteToken('dock-a', 'https://example.com', true)
      internal.revokeRemoteToken(token)
      expect(internal.isRemoteTokenTrusted(token, 'https://example.com')).toBe(false)
      internalContextMap.delete(ctx)
    })

    it('revokeRemoteTokensForDock removes every token tied to the dock', () => {
      const ctx = createMockContext()
      const internal = getInternalContext(ctx)

      const t1 = internal.allocateRemoteToken('dock-a', 'https://example.com', true)
      const t2 = internal.allocateRemoteToken('dock-a', 'https://example.com', true)
      const t3 = internal.allocateRemoteToken('dock-b', 'https://example.com', true)

      internal.revokeRemoteTokensForDock('dock-a')
      expect(internal.remoteTokens.has(t1)).toBe(false)
      expect(internal.remoteTokens.has(t2)).toBe(false)
      expect(internal.remoteTokens.has(t3)).toBe(true)
      internalContextMap.delete(ctx)
    })
  })
})
