import type { ConnectionMeta } from '@vitejs/devtools-kit'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getInspectedWindowMetadata, metadataEval, registerBrowserExtensionOrigin, resolveInspectedWindowConnectionMeta } from './inspected-window'

interface ChromeEvalResult {
  authToken?: string
  connectionMeta?: ConnectionMeta
}

function stubInspectedWindow(result: ChromeEvalResult | null) {
  vi.stubGlobal('chrome', {
    devtools: {
      inspectedWindow: {
        eval: vi.fn((_expression, callback) => callback(result)),
      },
    },
  })
}

describe('inspected window metadata', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('reads the standard Devframe handoff from the inspected page', async () => {
    const connectionMeta: ConnectionMeta = {
      backend: 'websocket',
      websocket: { path: '__ws' },
      baseUrl: 'http://localhost:5173/__devtools/__connection.json',
    }
    stubInspectedWindow({
      authToken: 'trusted-token',
      connectionMeta,
    })

    await expect(getInspectedWindowMetadata()).resolves.toEqual({
      authToken: 'trusted-token',
      connectionMeta,
    })
    expect(metadataEval).toContain('__DEVFRAME_CONNECTION_META__')
    expect(metadataEval).toContain('__DEVFRAME_CONNECTION_AUTH_TOKEN__')
  })

  it('returns null until the injected client publishes the handoff', async () => {
    stubInspectedWindow({})

    await expect(getInspectedWindowMetadata()).resolves.toBeNull()
  })

  it('anchors a standalone WS port to the inspected page instead of the extension panel', () => {
    expect(resolveInspectedWindowConnectionMeta({
      backend: 'websocket',
      websocket: 7812,
      baseUrl: 'http://localhost:3000/__devtools/__connection.json',
    })).toEqual({
      backend: 'websocket',
      websocket: 'ws://localhost:7812/',
      baseUrl: 'http://localhost:3000/__devtools/__connection.json',
    })
  })

  it('preserves route-bound WS metadata', () => {
    const connectionMeta = {
      backend: 'websocket' as const,
      websocket: { path: '__ws' },
      baseUrl: 'https://example.com/__devtools/__connection.json',
    }

    expect(resolveInspectedWindowConnectionMeta(connectionMeta)).toBe(connectionMeta)
  })

  it('registers the panel origin through the connection metadata endpoint', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetch)

    await registerBrowserExtensionOrigin(
      'http://localhost:5173/__devtools/__connection.json',
      'chrome-extension://abcdefghijklmnopabcdefghijklmnop',
    )

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:5173/__devtools/__connection.json?browser-extension-origin=chrome-extension%3A%2F%2Fabcdefghijklmnopabcdefghijklmnop',
      { cache: 'no-store' },
    )
  })

  it('surfaces a rejected browser extension origin registration', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
    }))

    await expect(
      registerBrowserExtensionOrigin(
        'http://localhost:5173/__devtools/__connection.json',
        'chrome-extension://abcdefghijklmnopabcdefghijklmnop',
      ),
    ).rejects.toThrow('Unable to register the browser extension origin (403).')
  })
})
