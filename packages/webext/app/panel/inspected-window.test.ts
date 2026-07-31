import type { DevframeConnection } from 'devframe/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { connectionEval, getInspectedWindowConnection, registerBrowserExtensionOrigin } from './inspected-window'

function stubInspectedWindow(result: DevframeConnection | null) {
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

  it('reads the standard Devframe connection from the inspected page', async () => {
    const connection: DevframeConnection = {
      connectionMeta: {
        backend: 'websocket',
        websocket: { path: '__ws' },
      },
      metaBaseUrl: 'http://localhost:5173/__devtools/__connection.json',
      authToken: 'trusted-token',
    }
    stubInspectedWindow(connection)

    await expect(getInspectedWindowConnection()).resolves.toBe(connection)
    expect(connectionEval).toContain('__DEVFRAME_CONNECTION__')
  })

  it('returns null until the injected client publishes the connection', async () => {
    stubInspectedWindow(null)

    await expect(getInspectedWindowConnection()).resolves.toBeNull()
  })

  it('rejects an incomplete connection snapshot', async () => {
    stubInspectedWindow({
      connectionMeta: {
        backend: 'websocket',
        websocket: 7812,
      },
      metaBaseUrl: '',
    })

    await expect(getInspectedWindowConnection()).resolves.toBeNull()
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
