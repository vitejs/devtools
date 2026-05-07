import type { DevToolsNodeContext, DevToolsRpcClientFunctions, DevToolsRpcServerFunctions } from 'devframe/types'
import { AsyncLocalStorage } from 'node:async_hooks'
import { createRpcStreamingClientHost } from 'devframe/client'
import { createRpcClient } from 'devframe/rpc/client'
import { createRpcServer } from 'devframe/rpc/server'
import { createWsRpcChannel } from 'devframe/rpc/transports/ws-client'
import { attachWsRpcTransport } from 'devframe/rpc/transports/ws-server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WebSocket } from 'ws'
import { RpcFunctionsHost } from '../host-functions'

vi.stubGlobal('WebSocket', WebSocket)

let nextPort = 41000
function allocatePort(): number {
  return nextPort++
}

interface Harness {
  port: number
  rpcHost: RpcFunctionsHost
  close: () => Promise<void>
}

async function bootHost(): Promise<Harness> {
  const port = allocatePort()
  const mockContext = {} as DevToolsNodeContext
  const rpcHost = new RpcFunctionsHost(mockContext)

  const asyncStorage = new AsyncLocalStorage<any>()

  const rpcGroup = createRpcServer<DevToolsRpcClientFunctions, DevToolsRpcServerFunctions>(
    rpcHost.functions,
    {
      rpcOptions: {
        resolver(_name, fn) {
          // eslint-disable-next-line ts/no-this-alias
          const rpc = this
          if (!fn)
            return undefined
          return async function (this: any, ...args) {
            return await asyncStorage.run({ rpc, meta: rpc.$meta }, async () => {
              return (await fn).apply(this, args)
            })
          }
        },
      },
    },
  )

  const { wss } = attachWsRpcTransport(rpcGroup, {
    port,
    host: '127.0.0.1',
    onDisconnected: (_ws, meta) => {
      rpcHost._emitSessionDisconnected(meta)
    },
  })

  ;(rpcHost as any)._rpcGroup = rpcGroup
  ;(rpcHost as any)._asyncStorage = asyncStorage

  return {
    port,
    rpcHost,
    async close() {
      for (const ws of wss.clients) ws.terminate()
      await new Promise<void>(r => wss.close(() => r()))
    },
  }
}

interface FakeClient {
  rpc: ReturnType<typeof createRpcClient<DevToolsRpcServerFunctions, DevToolsRpcClientFunctions>>
  streaming: ReturnType<typeof createRpcStreamingClientHost>
  close: () => void
}

function bootClient(port: number): FakeClient {
  // Mimic the minimal `DevToolsRpcClient` surface that
  // `createRpcStreamingClientHost` uses (events, isTrusted, callEvent,
  // client.register).
  const listeners = new Set<(trusted: boolean) => void>()
  const fakeEvents = {
    on(name: string, fn: (trusted: boolean) => void) {
      if (name === 'rpc:is-trusted:updated')
        listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }

  // Lazily filled below, but the streaming host needs it during register().
  // We use the actual client functions object as the "client.register" target.
  const clientFns: any = {}
  const clientRpcStub = {
    register(def: { name: string, handler: (...args: any[]) => any }) {
      clientFns[def.name] = def.handler
    },
  }

  const rpc = createRpcClient<DevToolsRpcServerFunctions, DevToolsRpcClientFunctions>(
    clientFns,
    {
      channel: createWsRpcChannel({ url: `ws://127.0.0.1:${port}` }),
    },
  )

  const fakeRpcClient = {
    isTrusted: true,
    events: fakeEvents,
    client: clientRpcStub,
    callEvent: (name: any, ...args: any[]) => (rpc as any).$callEvent(name, ...args),
  } as any

  const streaming = createRpcStreamingClientHost(fakeRpcClient)

  return {
    rpc,
    streaming,
    close() {
      // ws closes when server tears down
    },
  }
}

describe('rpc-streaming integration', () => {
  let harness: Harness

  beforeEach(async () => {
    harness = await bootHost()
  })

  afterEach(async () => {
    await harness.close()
  })

  it('round-trips chunks from server to client in order', async () => {
    const channel = harness.rpcHost.streaming.create<string>('test:words', {
      replayWindow: 64,
    })

    const client = bootClient(harness.port)

    // give the WS a moment to connect
    await new Promise(r => setTimeout(r, 50))

    const stream = channel.start({ id: 'words-1' })
    const reader = client.streaming.subscribe<string>('test:words', 'words-1')

    // small delay so subscribe arrives before producer writes
    await new Promise(r => setTimeout(r, 30))

    stream.write('alpha')
    stream.write('beta')
    stream.write('gamma')
    stream.close()

    const collected: string[] = []
    for await (const chunk of reader)
      collected.push(chunk)

    expect(collected).toEqual(['alpha', 'beta', 'gamma'])
    expect(reader.done).toBe(true)
  })

  it('replays buffered chunks for a late subscriber', async () => {
    const channel = harness.rpcHost.streaming.create<string>('test:replay', {
      replayWindow: 64,
    })

    const client = bootClient(harness.port)
    await new Promise(r => setTimeout(r, 50))

    // Producer runs first — subscriber comes later.
    const stream = channel.start({ id: 'replay-1' })
    stream.write('one')
    stream.write('two')
    stream.write('three')

    const reader = client.streaming.subscribe<string>('test:replay', 'replay-1')
    await new Promise(r => setTimeout(r, 50))
    stream.close()

    const collected: string[] = []
    for await (const chunk of reader)
      collected.push(chunk)

    expect(collected).toEqual(['one', 'two', 'three'])
  })

  it('aborts the server stream when a client cancels (single subscriber)', async () => {
    const channel = harness.rpcHost.streaming.create<number>('test:cancel')
    const client = bootClient(harness.port)
    await new Promise(r => setTimeout(r, 50))

    const stream = channel.start({ id: 'cancel-1' })
    const reader = client.streaming.subscribe<number>('test:cancel', 'cancel-1')

    await new Promise(r => setTimeout(r, 30))

    expect(stream.signal.aborted).toBe(false)
    reader.cancel()

    await vi.waitFor(() => {
      expect(stream.signal.aborted).toBe(true)
    })
  })

  it('fans out the same chunks to two subscribers', async () => {
    const channel = harness.rpcHost.streaming.create<string>('test:fanout', {
      replayWindow: 8,
    })

    const a = bootClient(harness.port)
    const b = bootClient(harness.port)
    await new Promise(r => setTimeout(r, 50))

    const stream = channel.start({ id: 'fan-1' })
    const readerA = a.streaming.subscribe<string>('test:fanout', 'fan-1')
    const readerB = b.streaming.subscribe<string>('test:fanout', 'fan-1')

    await new Promise(r => setTimeout(r, 30))

    stream.write('hello')
    stream.write('world')
    stream.close()

    const collectedA: string[] = []
    const collectedB: string[] = []
    for await (const chunk of readerA) collectedA.push(chunk)
    for await (const chunk of readerB) collectedB.push(chunk)

    expect(collectedA).toEqual(['hello', 'world'])
    expect(collectedB).toEqual(['hello', 'world'])
  })

  it('uploads chunks from client to server in order', async () => {
    const channel = harness.rpcHost.streaming.create<string>('test:upload-happy')
    const reader = channel.openInbound({ id: 'up-1' })

    const client = bootClient(harness.port)
    await new Promise(r => setTimeout(r, 50))

    const sink = client.streaming.upload<string>('test:upload-happy', 'up-1')
    sink.write('alpha')
    sink.write('beta')
    sink.write('gamma')
    sink.close()

    const collected: string[] = []
    for await (const chunk of reader)
      collected.push(chunk)

    expect(collected).toEqual(['alpha', 'beta', 'gamma'])
  })

  it('propagates client-side error to the server reader', async () => {
    const channel = harness.rpcHost.streaming.create<string>('test:upload-error')
    const reader = channel.openInbound({ id: 'up-2' })

    const client = bootClient(harness.port)
    await new Promise(r => setTimeout(r, 50))

    const sink = client.streaming.upload<string>('test:upload-error', 'up-2')
    sink.write('hello')
    sink.error(new Error('upstream-bork'))

    const collected: string[] = []
    let caught: unknown
    try {
      for await (const chunk of reader)
        collected.push(chunk)
    }
    catch (e) {
      caught = e
    }
    expect(collected).toEqual(['hello'])
    expect(caught).toBeInstanceOf(Error)
    expect((caught as Error).message).toBe('upstream-bork')
  })

  it('aborts the client sink when the server cancels', async () => {
    const channel = harness.rpcHost.streaming.create<string>('test:upload-server-cancel')
    const reader = channel.openInbound({ id: 'up-3' })

    const client = bootClient(harness.port)
    await new Promise(r => setTimeout(r, 50))

    const sink = client.streaming.upload<string>('test:upload-server-cancel', 'up-3')
    sink.write('first')

    // Server consumes one chunk then cancels.
    const consumed: string[] = []
    const consumer = (async () => {
      for await (const chunk of reader) {
        consumed.push(chunk)
        if (consumed.length === 1)
          reader.cancel()
      }
    })()

    await consumer

    await vi.waitFor(() => {
      expect(sink.signal.aborted).toBe(true)
    })
    expect(consumed).toEqual(['first'])
  })

  it('ends the server reader when the uploading client disconnects', async () => {
    const channel = harness.rpcHost.streaming.create<string>('test:upload-disconnect')
    const reader = channel.openInbound({ id: 'up-4' })

    const client = bootClient(harness.port)
    await new Promise(r => setTimeout(r, 50))

    const sink = client.streaming.upload<string>('test:upload-disconnect', 'up-4')
    sink.write('mid-flight')

    // Drain at least the first chunk before terminating.
    const collected: string[] = []
    const consumer = (async () => {
      try {
        for await (const chunk of reader)
          collected.push(chunk)
      }
      catch {
        // Disconnect surfaces as an error end frame; that's the test path.
      }
    })()

    await new Promise(r => setTimeout(r, 50))

    // Slam the WS server side so the uploading session disconnects.
    await harness.close()

    await consumer
    expect(collected).toEqual(['mid-flight'])
  })

  it('keeps the stream alive when one of two subscribers cancels', async () => {
    const channel = harness.rpcHost.streaming.create<string>('test:fanout-cancel', {
      replayWindow: 8,
    })

    const a = bootClient(harness.port)
    const b = bootClient(harness.port)
    await new Promise(r => setTimeout(r, 50))

    const stream = channel.start({ id: 'fan-2' })
    const readerA = a.streaming.subscribe<string>('test:fanout-cancel', 'fan-2')
    const readerB = b.streaming.subscribe<string>('test:fanout-cancel', 'fan-2')

    await new Promise(r => setTimeout(r, 30))

    stream.write('first')
    await new Promise(r => setTimeout(r, 30))
    readerA.cancel()
    await new Promise(r => setTimeout(r, 30))

    expect(stream.signal.aborted).toBe(false)

    stream.write('second')
    stream.close()

    const collectedB: string[] = []
    for await (const chunk of readerB) collectedB.push(chunk)
    expect(collectedB).toEqual(['first', 'second'])
  })
})
