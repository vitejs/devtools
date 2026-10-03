import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDevToolsRpcClient } from './connection'

const mocks = vi.hoisted(() => ({
  getDevframeRpcClient: vi.fn(async () => ({})),
}))

vi.mock('@devframes/hub/client', () => ({
  getDevframeRpcClient: mocks.getDevframeRpcClient,
}))

describe('getDevToolsRpcClient', () => {
  beforeEach(() => {
    mocks.getDevframeRpcClient.mockClear()
  })

  it('disables devframe simple auth in favor of the Vite DevTools auth UI', async () => {
    await getDevToolsRpcClient({ baseURL: '/__devtools/' })

    expect(mocks.getDevframeRpcClient).toHaveBeenCalledWith({
      baseURL: '/__devtools/',
      simpleAuth: false,
    })
  })

  it('does not allow callers to enable the browser-prompt fallback', async () => {
    await getDevToolsRpcClient({ simpleAuth: true })

    expect(mocks.getDevframeRpcClient).toHaveBeenCalledWith({
      simpleAuth: false,
    })
  })
})
