import type { StartedServer } from 'devframe/node'
import { createRpcStreamingClientHost } from 'devframe/client'
import { createRpcClient } from 'devframe/rpc/client'
import { createWsRpcChannel } from 'devframe/rpc/transports/ws-client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WebSocket } from 'ws'
import { startStreamingChatServer } from './_utils'

vi.stubGlobal('WebSocket', WebSocket)

const CHANNEL = 'devframe-streaming-chat:tokens'

interface FakeClient {
  rpc: ReturnType<typeof createRpcClient>
  streaming: ReturnType<typeof createRpcStreamingClientHost>
}

/**
 * Build a minimal RPC client + streaming host. We don't go through
 * `connectDevtool` because that needs a browser-like environment for
 * connection-meta lookup; the WS channel is what matters for streaming.
 */
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

  const rpc = createRpcClient<any, any>(
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
  return { rpc, streaming }
}

describe('devframe-streaming-chat (example)', () => {
  let server: StartedServer & { basePath: string }

  beforeEach(async () => {
    server = await startStreamingChatServer()
  })

  afterEach(async () => {
    await server?.close()
  })

  it('streams tokens for a prompt and joins back to the full response', async () => {
    const client = bootClient(server.port)
    await new Promise(r => setTimeout(r, 50))

    const { streamId } = await (client.rpc as any).$call(
      'devframe-streaming-chat:start',
      { prompt: 'Tell me about devframe.', intervalMs: 1 },
    ) as { streamId: string }

    const reader = client.streaming.subscribe<string>(CHANNEL, streamId)
    const collected: string[] = []
    for await (const token of reader)
      collected.push(token)

    expect(collected.length).toBeGreaterThan(5)
    expect(collected.join('')).toContain('devframe')
    expect(collected.join('')).toContain('You asked')
  })

  it('cancellation aborts the producer mid-stream', async () => {
    const client = bootClient(server.port)
    await new Promise(r => setTimeout(r, 50))

    const { streamId } = await (client.rpc as any).$call(
      'devframe-streaming-chat:start',
      { prompt: 'How does streaming work?', intervalMs: 30 },
    ) as { streamId: string }

    const reader = client.streaming.subscribe<string>(CHANNEL, streamId)
    const collected: string[] = []

    const consumer = (async () => {
      for await (const token of reader) {
        collected.push(token)
        if (collected.length >= 3)
          reader.cancel()
      }
    })()

    await consumer
    const collectedAtCancel = collected.length

    // Wait long enough that more tokens would have arrived had we not
    // cancelled, then assert no more came in.
    await new Promise(r => setTimeout(r, 200))
    expect(collected.length).toBe(collectedAtCancel)
    expect(reader.cancelled).toBe(true)
  })

  it('fans out the same chunks to two subscribers', async () => {
    const a = bootClient(server.port)
    const b = bootClient(server.port)
    await new Promise(r => setTimeout(r, 50))

    const { streamId } = await (a.rpc as any).$call(
      'devframe-streaming-chat:start',
      { prompt: 'Write a haiku about RPC.', intervalMs: 1 },
    ) as { streamId: string }

    const readerA = a.streaming.subscribe<string>(CHANNEL, streamId)
    const readerB = b.streaming.subscribe<string>(CHANNEL, streamId)

    const collectedA: string[] = []
    const collectedB: string[] = []
    await Promise.all([
      (async () => { for await (const t of readerA) collectedA.push(t) })(),
      (async () => { for await (const t of readerB) collectedB.push(t) })(),
    ])

    expect(collectedA.join('')).toBe(collectedB.join(''))
    // Haiku-prompt response uses these tokens; assert content matches the
    // canned response so we know the producer routed by prompt correctly.
    expect(collectedA.join('')).toContain('Tiny chunks arrive')
  })

  it('replays buffered tokens for a late subscriber within the replayWindow', async () => {
    const client = bootClient(server.port)
    await new Promise(r => setTimeout(r, 50))

    // Fire the action; the producer starts emitting at intervalMs=1.
    const { streamId } = await (client.rpc as any).$call(
      'devframe-streaming-chat:start',
      { prompt: 'Tell me about devframe.', intervalMs: 5 },
    ) as { streamId: string }

    // Wait long enough that the producer has fully emitted into the
    // server's ring buffer (size 256, more than enough for our response).
    await new Promise(r => setTimeout(r, 800))

    // Subscribe AFTER the producer has finished — the replay window
    // means we still receive every token + the end frame.
    const reader = client.streaming.subscribe<string>(CHANNEL, streamId)
    const collected: string[] = []
    for await (const token of reader)
      collected.push(token)

    expect(collected.length).toBeGreaterThan(5)
    expect(collected.join('')).toContain('You asked')
  })
})
