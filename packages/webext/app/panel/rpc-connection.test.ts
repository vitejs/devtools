import type { DevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { describe, expect, it, vi } from 'vitest'
import { waitForRpcConnection } from './rpc-connection'

function createRpc(status: DevToolsRpcClient['status'], connectionError: Error | null = null) {
  let listener: ((status: DevToolsRpcClient['status']) => void) | undefined
  const rpc = {
    status,
    connectionError,
    events: {
      on: vi.fn((_event, callback) => {
        listener = callback
        return vi.fn()
      }),
    },
  } as unknown as DevToolsRpcClient

  return {
    rpc,
    emit(nextStatus: DevToolsRpcClient['status']) {
      Object.defineProperty(rpc, 'status', { value: nextStatus })
      listener?.(nextStatus)
    },
  }
}

describe('waitForRpcConnection', () => {
  it.each(['connected', 'unauthorized'] as const)('accepts the %s state', async (status) => {
    const { rpc } = createRpc(status)

    await expect(waitForRpcConnection(rpc)).resolves.toBeUndefined()
    expect(rpc.events.on).not.toHaveBeenCalled()
  })

  it('waits for the initial trust handshake', async () => {
    const { rpc, emit } = createRpc('connecting')
    const ready = waitForRpcConnection(rpc)

    emit('unauthorized')

    await expect(ready).resolves.toBeUndefined()
  })

  it('surfaces transport failures before mounting the docks', async () => {
    const error = new Error('WebSocket connection failed')
    const { rpc, emit } = createRpc('connecting', error)
    const ready = waitForRpcConnection(rpc)

    emit('error')

    await expect(ready).rejects.toMatchObject({
      message: 'Unable to connect to the Vite DevTools WebSocket (error).',
      cause: error,
    })
  })
})
