import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDevToolsRpcClient } from './connection'

const mocks = vi.hoisted(() => ({
  getDevframeRpcClient: vi.fn(async () => ({})),
  parseRemoteConnection: vi.fn(),
}))

vi.mock('@devframes/hub/client', () => ({
  getDevframeRpcClient: mocks.getDevframeRpcClient,
  parseRemoteConnection: mocks.parseRemoteConnection,
}))

describe('getDevToolsRpcClient', () => {
  beforeEach(() => {
    mocks.getDevframeRpcClient.mockClear()
    mocks.parseRemoteConnection.mockReset()
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

  it('uses a remote connection descriptor in external viewers', async () => {
    mocks.parseRemoteConnection.mockReturnValue({
      v: 1,
      backend: 'websocket',
      websocket: 'ws://localhost:5173/__devtools/__ws',
      authToken: 'trusted-token',
      origin: 'http://localhost:5173',
    })

    await getDevToolsRpcClient()

    expect(mocks.getDevframeRpcClient).toHaveBeenCalledWith({
      connection: {
        connectionMeta: {
          backend: 'websocket',
          websocket: 'ws://localhost:5173/__devtools/__ws',
        },
        metaBaseUrl: 'http://localhost:5173',
        authToken: 'trusted-token',
      },
      simpleAuth: false,
    })
  })
})
