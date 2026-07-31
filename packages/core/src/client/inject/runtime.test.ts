import type { DevframeConnection } from 'devframe/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startDevTools } from './runtime'

const DEVFRAME_CONNECTION_KEY = '__DEVFRAME_CONNECTION__'
const DEVFRAME_CONNECTION_META_KEY = '__DEVFRAME_CONNECTION_META__'

const mocks = vi.hoisted(() => ({
  getDevToolsRpcClient: vi.fn(
    (_options: { connection: DevframeConnection }) => new Promise(() => {}),
  ),
}))

vi.mock('@vitejs/devtools-kit/client', () => ({
  CLIENT_CONTEXT_KEY: '__VITE_DEVTOOLS_CLIENT_CONTEXT__',
  getDevToolsRpcClient: mocks.getDevToolsRpcClient,
}))

vi.mock('@vueuse/core', () => ({
  useLocalStorage: vi.fn(),
}))

vi.mock('../webcomponents/state/context', () => ({
  createDocksContext: vi.fn(),
}))

describe('injected DevTools runtime', () => {
  beforeEach(() => {
    const hostWindow = {
      addEventListener: vi.fn(),
      location: {
        href: 'http://localhost:5173/',
      },
    } as unknown as Window
    Object.defineProperty(hostWindow, 'parent', { value: hostWindow })
    vi.stubGlobal('window', hostWindow)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      url: 'http://localhost:5173/__devtools/__connection.json',
      json: () => Promise.resolve({
        backend: 'websocket',
        websocket: { path: '__ws' },
      }),
    }))
  })

  afterEach(() => {
    delete (globalThis as Record<string, unknown>)[DEVFRAME_CONNECTION_KEY]
    delete (globalThis as Record<string, unknown>)[DEVFRAME_CONNECTION_META_KEY]
    vi.unstubAllGlobals()
    mocks.getDevToolsRpcClient.mockClear()
  })

  it('preserves the host-relative mount path as the primary base', async () => {
    startDevTools('normal')
    await vi.waitFor(() => expect(mocks.getDevToolsRpcClient).toHaveBeenCalled())
    const options = mocks.getDevToolsRpcClient.mock.calls[0]![0]

    expect(options.connection.metaBaseUrl).toBe(
      'http://localhost:5173/__devtools/__connection.json',
    )
  })

  it('passes the prepared connection to the RPC client', async () => {
    startDevTools('normal')
    await vi.waitFor(() => expect(mocks.getDevToolsRpcClient).toHaveBeenCalled())
    const options = mocks.getDevToolsRpcClient.mock.calls[0]![0]

    expect(options.connection.connectionMeta).toEqual({
      backend: 'websocket',
      websocket: { path: '__ws' },
    })
  })

  it.each(['normal', 'passive', 'hidden'] as const)(
    'publishes a standard connection without unnecessarily mounting the %s overlay',
    async (mode) => {
      startDevTools(mode)

      await vi.waitFor(() => {
        expect((globalThis as Record<string, any>)[DEVFRAME_CONNECTION_KEY]).toEqual({
          connectionMeta: {
            backend: 'websocket',
            websocket: { path: '__ws' },
          },
          metaBaseUrl: 'http://localhost:5173/__devtools/__connection.json',
          authToken: undefined,
        })
      })
      if (mode !== 'normal')
        expect(mocks.getDevToolsRpcClient).not.toHaveBeenCalled()
    },
  )
})
