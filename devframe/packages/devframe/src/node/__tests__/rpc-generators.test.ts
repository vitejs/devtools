import type { DevToolsNodeContext, DevToolsRpcClientFunctions, DevToolsRpcServerFunctions } from 'devframe/types'
import type { StreamReader } from 'devframe/utils/streaming-channel'
import { AsyncLocalStorage } from 'node:async_hooks'
import { createRpcStreamingClientHost } from 'devframe/client'
import { createRpcClient } from 'devframe/rpc/client'
import { createRpcServer } from 'devframe/rpc/server'
import { createWsRpcChannel } from 'devframe/rpc/transports/ws-client'
import { attachWsRpcTransport } from 'devframe/rpc/transports/ws-server'
import * as v from 'valibot'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WebSocket } from 'ws'
import { RpcFunctionsHost } from '../host-functions'
import {
  getCurrentRpcStream,
  invokeLocalGenerator,
} from '../rpc-generators'

// Mirrors the internal constant in `node/rpc-generators.ts`. The test
// harness uses it to subscribe to the hidden channel directly because it
// bypasses the full client-side `attachRpcGeneratorsClient` wrapper.
const GENERATOR_CHANNEL = 'devframe:rpc:generators'

vi.stubGlobal('WebSocket', WebSocket)

let nextPort = 42_000
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
  /** Calls the generator RPC and returns the auto-subscribed reader. */
  callGenerator: <Y = unknown>(name: string, ...args: any[]) => Promise<StreamReader<Y>>
  close: () => void
}

function bootClient(port: number): FakeClient {
  const listeners = new Set<(trusted: boolean) => void>()
  const fakeEvents = {
    on(name: string, fn: (trusted: boolean) => void) {
      if (name === 'rpc:is-trusted:updated')
        listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }

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

  // Mirrors `attachRpcGeneratorsClient` — but applied to our minimal fake
  // client, so we can verify the envelope-unwrap logic without depending
  // on the full DevToolsRpcClient surface used by `connectDevtool`.
  async function callGenerator<Y = unknown>(name: string, ...args: any[]): Promise<StreamReader<Y>> {
    const result: any = await (rpc as any).$call(name, ...args)
    if (!result || result.__generator !== true || typeof result.streamId !== 'string')
      throw new Error(`Expected generator envelope from "${name}"; got ${JSON.stringify(result)}`)
    return streaming.subscribe<Y>(GENERATOR_CHANNEL, result.streamId)
  }

  return {
    rpc,
    streaming,
    callGenerator,
    close() {
      // ws closes when server tears down
    },
  }
}

describe('rpc-generators integration', () => {
  let harness: Harness

  beforeEach(async () => {
    harness = await bootHost()
  })

  afterEach(async () => {
    await harness.close()
  })

  it('round-trips yields from a generator handler to the client reader', async () => {
    harness.rpcHost.register({
      name: 'test:gen-happy',
      type: 'generator',
      yields: v.string(),
      async* handler() {
        yield 'a'
        yield 'b'
        yield 'c'
      },
    } as any)

    const client = bootClient(harness.port)
    await new Promise(r => setTimeout(r, 50))

    const reader = await client.callGenerator<string>('test:gen-happy')
    const collected: string[] = []
    for await (const chunk of reader) collected.push(chunk)

    expect(collected).toEqual(['a', 'b', 'c'])
    expect(reader.done).toBe(true)
  })

  it('exposes the abort signal via getCurrentRpcStream and stops cooperatively on cancel', async () => {
    let observedAbort = false
    let yieldsBeforeAbort = 0

    harness.rpcHost.register({
      name: 'test:gen-cancel',
      type: 'generator',
      yields: v.number(),
      async* handler() {
        const ctx = getCurrentRpcStream()!
        for (let i = 0; i < 100; i++) {
          if (ctx.signal.aborted) {
            observedAbort = true
            return
          }
          yieldsBeforeAbort = i + 1
          yield i
          await new Promise(r => setTimeout(r, 5))
        }
      },
    } as any)

    const client = bootClient(harness.port)
    await new Promise(r => setTimeout(r, 50))

    const reader = await client.callGenerator<number>('test:gen-cancel')
    const collected: number[] = []
    for await (const chunk of reader) {
      collected.push(chunk)
      if (collected.length >= 5) {
        reader.cancel()
      }
    }

    await vi.waitFor(() => {
      expect(observedAbort).toBe(true)
    })
    expect(collected.length).toBeGreaterThanOrEqual(5)
    expect(yieldsBeforeAbort).toBeLessThan(100)
  })

  it('propagates a thrown error from the generator to the client reader', async () => {
    harness.rpcHost.register({
      name: 'test:gen-throw',
      type: 'generator',
      yields: v.string(),
      async* handler() {
        yield 'first'
        yield 'second'
        throw new Error('handler-bork')
      },
    } as any)

    const client = bootClient(harness.port)
    await new Promise(r => setTimeout(r, 50))

    const reader = await client.callGenerator<string>('test:gen-throw')
    const collected: string[] = []
    let caught: unknown
    try {
      for await (const chunk of reader) collected.push(chunk)
    }
    catch (e) {
      caught = e
    }
    expect(collected).toEqual(['first', 'second'])
    expect(caught).toBeInstanceOf(Error)
    expect((caught as Error).message).toBe('handler-bork')
  })

  it('rejects the call when the generator throws before any yield', async () => {
    harness.rpcHost.register({
      name: 'test:gen-throw-immediate',
      type: 'generator',
      yields: v.string(),
      async* handler() {
        throw new Error('synthrow')

        yield 'never'
      },
    } as any)

    const client = bootClient(harness.port)
    await new Promise(r => setTimeout(r, 50))

    const reader = await client.callGenerator<string>('test:gen-throw-immediate')
    const collected: string[] = []
    let caught: unknown
    try {
      for await (const chunk of reader) collected.push(chunk)
    }
    catch (e) {
      caught = e
    }
    expect(collected).toEqual([])
    expect((caught as Error).message).toBe('synthrow')
  })

  it('replays buffered yields for a late subscriber within the replay window', async () => {
    harness.rpcHost.register({
      name: 'test:gen-replay',
      type: 'generator',
      yields: v.string(),
      replayWindow: 64,
      async* handler() {
        yield 'one'
        yield 'two'
        yield 'three'
      },
    } as any)

    const client = bootClient(harness.port)
    await new Promise(r => setTimeout(r, 50))

    // The client subscribe lands a few ms after the wrapper allocates the
    // sink. The default replay window of 256 (or our 64 here) buffers the
    // early yields.
    const reader = await client.callGenerator<string>('test:gen-replay')
    const collected: string[] = []
    for await (const chunk of reader) collected.push(chunk)

    expect(collected).toEqual(['one', 'two', 'three'])
  })

  it('isolates concurrent generator calls with independent stream ids', async () => {
    harness.rpcHost.register({
      name: 'test:gen-isolate',
      type: 'generator',
      args: [v.object({ tag: v.string() })],
      yields: v.string(),
      async* handler({ tag }: { tag: string }) {
        yield `${tag}-1`
        yield `${tag}-2`
      },
    } as any)

    const client = bootClient(harness.port)
    await new Promise(r => setTimeout(r, 50))

    const [readerA, readerB] = await Promise.all([
      client.callGenerator<string>('test:gen-isolate', { tag: 'A' }),
      client.callGenerator<string>('test:gen-isolate', { tag: 'B' }),
    ])

    const [a, b] = await Promise.all([
      (async () => {
        const r: string[] = []
        for await (const c of readerA) r.push(c)
        return r
      })(),
      (async () => {
        const r: string[] = []
        for await (const c of readerB) r.push(c)
        return r
      })(),
    ])

    expect(a).toEqual(['A-1', 'A-2'])
    expect(b).toEqual(['B-1', 'B-2'])
    expect(readerA.id).not.toBe(readerB.id)
  })

  it('invokeLocalGenerator yields directly without traversing the transport', async () => {
    harness.rpcHost.register({
      name: 'test:gen-local',
      type: 'generator',
      yields: v.string(),
      async* handler() {
        yield 'x'
        yield 'y'
        yield 'z'
      },
    } as any)

    const iter = await invokeLocalGenerator<string>(harness.rpcHost, 'test:gen-local')
    const collected: string[] = []
    for await (const v of iter) collected.push(v)
    expect(collected).toEqual(['x', 'y', 'z'])
  })

  it('rejects registration with `agent` set (DF0033)', () => {
    expect(() => harness.rpcHost.register({
      name: 'test:gen-agent',
      type: 'generator',
      yields: v.string(),
      agent: { description: 'should fail' },
      async* handler() { yield 'a' },
    } as any)).toThrow(/DF0033/)
  })

  it('rejects registration with `args` and no `yields` (DF0035)', () => {
    expect(() => harness.rpcHost.register({
      name: 'test:gen-no-yields',
      type: 'generator',
      args: [v.object({ q: v.string() })],
      async* handler() { yield 'a' },
    } as any)).toThrow(/DF0035/)
  })

  it('rejects registration with `cacheable: true` (DF0036)', () => {
    expect(() => harness.rpcHost.register({
      name: 'test:gen-cacheable',
      type: 'generator',
      cacheable: true,
      yields: v.string(),
      async* handler() { yield 'a' },
    } as any)).toThrow(/DF0036/)
  })

  it('rejects registration with `dump` (DF0027)', () => {
    expect(() => harness.rpcHost.register({
      name: 'test:gen-dump',
      type: 'generator',
      yields: v.string(),
      dump: { records: [] },
      async* handler() { yield 'a' },
    } as any)).toThrow(/DF0027/)
  })

  it('rejects a non-async-iterable handler at runtime (DF0034)', async () => {
    harness.rpcHost.register({
      name: 'test:gen-not-iter',
      type: 'generator',
      yields: v.string(),
      // Wrong shape: returns a string instead of yielding it.
      handler: (async () => 'oops') as any,
    } as any)

    const client = bootClient(harness.port)
    await new Promise(r => setTimeout(r, 50))

    const reader = await client.callGenerator<string>('test:gen-not-iter')
    let caught: unknown
    try {
      for await (const _v of reader) { /* drain */ }
    }
    catch (e) {
      caught = e
    }
    expect((caught as Error).message).toMatch(/DF0034/)
  })
})
