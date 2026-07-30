import type { CreateWsServerOptions } from './ws'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDevToolsMiddleware } from './server'

const mocks = vi.hoisted(() => ({
  getConnectionMeta: vi.fn(async () => ({
    backend: 'websocket',
    websocket: { path: '__ws' },
  })),
  mountStaticHandler: vi.fn(),
  registerBrowserExtensionOrigin: vi.fn(() => true),
}))

vi.mock('devframe/utils/serve-static', () => ({
  mountStaticHandler: mocks.mountStaticHandler,
}))

vi.mock('./ws', () => ({
  createWsServer: vi.fn(async () => ({
    rpc: {},
    getConnectionMeta: mocks.getConnectionMeta,
    registerBrowserExtensionOrigin: mocks.registerBrowserExtensionOrigin,
  })),
}))

function createOptions(): CreateWsServerOptions {
  return {
    cwd: process.cwd(),
    websocket: {
      host: 'localhost',
    },
    context: {
      host: {
        provideConnectionMeta: vi.fn(),
      },
    },
  } as unknown as CreateWsServerOptions
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.registerBrowserExtensionOrigin.mockReturnValue(true)
})

describe('connection metadata endpoint', () => {
  it('registers and allows the requesting browser extension origin', async () => {
    const { h3 } = await createDevToolsMiddleware(createOptions())
    const origin = 'chrome-extension://abcdefghijklmnopabcdefghijklmnop'

    const response = await h3.request('/__connection.json', {
      headers: {
        origin,
      },
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBe(origin)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(mocks.registerBrowserExtensionOrigin).toHaveBeenCalledWith(origin)
  })

  it('registers an explicitly supplied panel origin when extension fetch omits Origin', async () => {
    const { h3 } = await createDevToolsMiddleware(createOptions())
    const origin = 'chrome-extension://abcdefghijklmnopabcdefghijklmnop'

    const response = await h3.request(`/__connection.json?browser-extension-origin=${encodeURIComponent(origin)}`)

    expect(response.status).toBe(200)
    expect(response.headers.has('access-control-allow-origin')).toBe(false)
    expect(mocks.registerBrowserExtensionOrigin).toHaveBeenCalledWith(origin)
  })

  it('does not add CORS headers for ordinary web origins', async () => {
    mocks.registerBrowserExtensionOrigin.mockReturnValue(false)
    const { h3 } = await createDevToolsMiddleware(createOptions())

    const response = await h3.request('/__connection.json', {
      headers: {
        origin: 'https://example.com',
      },
    })

    expect(response.status).toBe(200)
    expect(response.headers.has('access-control-allow-origin')).toBe(false)
  })
})
