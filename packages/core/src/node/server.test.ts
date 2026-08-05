import type { CreateWsServerOptions } from './ws'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDevToolsMiddleware } from './server'

const mocks = vi.hoisted(() => ({
  getConnectionMeta: vi.fn(async () => ({
    backend: 'websocket',
    websocket: { path: '__ws' },
  })),
  mountStaticHandler: vi.fn(),
  registerFromUrl: vi.fn<(url: string) => string | undefined>(),
  isAllowed: vi.fn<(origin: string | undefined) => boolean>(() => false),
}))

vi.mock('devframe/utils/serve-static', () => ({
  mountStaticHandler: mocks.mountStaticHandler,
}))

vi.mock('./ws', () => ({
  createWsServer: vi.fn(async () => ({
    rpc: {},
    getConnectionMeta: mocks.getConnectionMeta,
    viewerOrigins: {
      registerFromUrl: mocks.registerFromUrl,
      isAllowed: mocks.isAllowed,
    },
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
  mocks.registerFromUrl.mockReturnValue(undefined)
  mocks.isAllowed.mockReturnValue(false)
})

describe('connection metadata endpoint', () => {
  it('allows a registered requesting browser extension origin', async () => {
    const { h3 } = await createDevToolsMiddleware(createOptions())
    const origin = 'chrome-extension://abcdefghijklmnopabcdefghijklmnop'
    mocks.registerFromUrl.mockReturnValue(origin)
    mocks.isAllowed.mockReturnValue(true)

    const response = await h3.request('/__connection.json?devframe_viewer_origin=extension&devframe_viewer_origin_token=token', {
      headers: {
        origin,
      },
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBe(origin)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(mocks.registerFromUrl).toHaveBeenCalledWith('http://localhost/__connection.json?devframe_viewer_origin=extension&devframe_viewer_origin_token=token')
  })

  it('registers an explicitly supplied panel origin when extension fetch omits Origin', async () => {
    const { h3 } = await createDevToolsMiddleware(createOptions())
    const origin = 'chrome-extension://abcdefghijklmnopabcdefghijklmnop'
    mocks.registerFromUrl.mockReturnValue(origin)

    const response = await h3.request(`/__connection.json?devframe_viewer_origin=${encodeURIComponent(origin)}&devframe_viewer_origin_token=token`)

    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBe(origin)
  })

  it('does not add CORS headers for ordinary web origins', async () => {
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
