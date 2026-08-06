import type { ResolvedConfig } from 'vite'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDevToolsContext } from '../context'
import { createWsServer } from '../ws'

const mocks = vi.hoisted(() => ({
  close: vi.fn(async () => {}),
}))

vi.mock('devframe/rpc/transports/ws-server', () => ({
  attachWsRpcTransport: vi.fn(() => ({
    close: mocks.close,
  })),
}))

describe('createWsServer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('closes its transport once', async () => {
    const context = await createDevToolsContext({
      root: process.cwd(),
      command: 'build',
      plugins: [],
      server: {},
    } as unknown as ResolvedConfig)
    const server = await createWsServer({
      cwd: process.cwd(),
      websocket: {
        host: 'localhost',
        port: 7812,
      },
      context,
    })

    await Promise.all([server.close(), server.close()])

    expect(mocks.close).toHaveBeenCalledOnce()
  })
})
