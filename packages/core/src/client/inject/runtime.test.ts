import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startDevTools } from './runtime'

const DEVFRAME_CONNECTION_META_KEY = '__DEVFRAME_CONNECTION_META__'

const mocks = vi.hoisted(() => ({
  getDevToolsRpcClient: vi.fn(
    (_options: { baseURL: string[] }) => new Promise(() => {}),
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
    delete (globalThis as Record<string, unknown>)[DEVFRAME_CONNECTION_META_KEY]
    vi.unstubAllGlobals()
    mocks.getDevToolsRpcClient.mockClear()
  })

  it('preserves the host-relative mount path as the primary base', async () => {
    startDevTools('normal')
    await vi.waitFor(() => expect(mocks.getDevToolsRpcClient).toHaveBeenCalled())
    const options = mocks.getDevToolsRpcClient.mock.calls[0]![0]

    expect(options.baseURL).toHaveLength(2)
    expect(options.baseURL[0]).toBe('/__devtools/')
  })

  it('adds the Vite module origin as the fallback base', async () => {
    startDevTools('normal')
    await vi.waitFor(() => expect(mocks.getDevToolsRpcClient).toHaveBeenCalled())
    const options = mocks.getDevToolsRpcClient.mock.calls[0]![0]

    expect(options.baseURL[1]).toBe(
      new URL('/__devtools/', import.meta.url).href,
    )
  })

  it.each(['normal', 'passive', 'hidden'] as const)(
    'publishes standard connection metadata without unnecessarily mounting the %s overlay',
    async (mode) => {
      startDevTools(mode)

      await vi.waitFor(() => {
        expect((globalThis as Record<string, any>)[DEVFRAME_CONNECTION_META_KEY]).toEqual({
          backend: 'websocket',
          websocket: { path: '__ws' },
          baseUrl: 'http://localhost:5173/__devtools/__connection.json',
        })
      })
      if (mode !== 'normal')
        expect(mocks.getDevToolsRpcClient).not.toHaveBeenCalled()
    },
  )
})
