import type { DevframeConnection } from 'devframe/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { connectionEval, getInspectedWindowConnection } from './inspected-window'

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
})
