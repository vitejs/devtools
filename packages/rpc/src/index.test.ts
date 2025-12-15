import { describe, expect, it, vi } from 'vitest'
import { WebSocket } from 'ws'
import { createRpcClient, createRpcServer } from '.'
import { createWsRpcPreset as createWsRpcClientPreset } from './presets/ws/client'
import { createWsRpcPreset as createWsRpcServerPreset } from './presets/ws/server'

vi.stubGlobal('WebSocket', WebSocket)

describe('devtools rpc', () => {
  it('should work w/ ws preset', async () => {
    const PORT = 3333
    const WS_URL = `ws://localhost:${PORT}`

    const serverFunctions = {
      hello: (no: number) => {
        return `hello world from client ${no}`
      },
    }

    const client1Functions = {
      hey: (name: string) => {
        return `hey ${name}, I'm client 1`
      },
    }

    const client2Functions = {
      hey: (name: string) => {
        return `hey ${name}, I'm client 2`
      },
    }

    const server = createRpcServer<typeof client1Functions | typeof client2Functions, typeof serverFunctions>(serverFunctions, {
      preset: createWsRpcServerPreset({ port: PORT }),
    })

    const client1 = createRpcClient<typeof serverFunctions, typeof client1Functions>(client1Functions, {
      preset: createWsRpcClientPreset({ url: WS_URL }),
    })

    const client2 = createRpcClient<typeof serverFunctions, typeof client2Functions>(client2Functions, {
      preset: createWsRpcClientPreset({ url: WS_URL }),
    })

    expect(await client1.$call('hello', 1)).toBe('hello world from client 1')

    expect(await client2.$call('hello', 2)).toBe('hello world from client 2')

    expect(await server.broadcast.$call('hey', 'server')).toEqual(expect.arrayContaining(['hey server, I\'m client 1', 'hey server, I\'m client 2']))
  })
})
