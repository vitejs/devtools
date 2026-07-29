import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startDevTools } from './runtime'

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
    } as unknown as Window
    Object.defineProperty(hostWindow, 'parent', { value: hostWindow })
    vi.stubGlobal('window', hostWindow)

    startDevTools('normal')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    mocks.getDevToolsRpcClient.mockClear()
  })

  it('preserves the host-relative mount path as the primary base', () => {
    const options = mocks.getDevToolsRpcClient.mock.calls[0]![0]

    expect(options.baseURL).toHaveLength(2)
    expect(options.baseURL[0]).toBe('/__devtools/')
  })

  it('adds the Vite module origin as the fallback base', () => {
    const options = mocks.getDevToolsRpcClient.mock.calls[0]![0]

    expect(options.baseURL[1]).toBe(
      new URL('/__devtools/', import.meta.url).href,
    )
  })
})
