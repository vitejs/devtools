import type { DevToolsNodeContext, StartedServer } from 'devframe/node'
import type { ChatHistory } from '../src/devframe'
import { createRpcStreamingClientHost } from 'devframe/client'
import { createRpcClient } from 'devframe/rpc/client'
import { createWsRpcChannel } from 'devframe/rpc/transports/ws-client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WebSocket } from 'ws'
import { startStreamingChatServer } from './_utils'

vi.stubGlobal('WebSocket', WebSocket)

const CHANNEL = 'devframe-streaming-chat:tokens'
const HISTORY_KEY = 'devframe-streaming-chat:history' as const

interface FakeClient {
  rpc: ReturnType<typeof createRpcClient>
  streaming: ReturnType<typeof createRpcStreamingClientHost>
}

/**
 * Build a minimal RPC client + streaming host. We don't go through
 * `connectDevframe` because that needs a browser-like environment for
 * connection-meta lookup; the WS channel is what matters for streaming.
 * Shared-state syncing happens server-side, so tests inspect it through
 * the harness `ctx` rather than over the wire.
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

interface SendResult {
  userId: string
  assistantId: string
  streamId: string
}

async function send(client: FakeClient, prompt: string, intervalMs = 1): Promise<SendResult> {
  return await (client.rpc as any).$call('devframe-streaming-chat:send', {
    prompt,
    intervalMs,
  }) as SendResult
}

async function readAll(reader: AsyncIterable<string>): Promise<string[]> {
  const out: string[] = []
  for await (const chunk of reader)
    out.push(chunk)
  return out
}

async function getHistory(ctx: DevToolsNodeContext): Promise<ChatHistory> {
  const state = await ctx.rpc.sharedState.get(HISTORY_KEY)
  return state.value() as ChatHistory
}

describe('devframe-streaming-chat (example)', () => {
  let server: StartedServer & { basePath: string, ctx: DevToolsNodeContext }

  beforeEach(async () => {
    server = await startStreamingChatServer()
  })

  afterEach(async () => {
    await server?.close()
  })

  it('appends user + assistant pair and commits final content to history', async () => {
    const client = bootClient(server.port)
    await new Promise(r => setTimeout(r, 50))

    const { userId, assistantId, streamId } = await send(client, 'Tell me about devframe.')
    const reader = client.streaming.subscribe<string>(CHANNEL, streamId)
    const tokens = await readAll(reader)
    const fullText = tokens.join('')

    expect(tokens.length).toBeGreaterThan(5)
    expect(fullText).toContain('You asked')

    // Wait for the post-stream sharedState mutation to land.
    await vi.waitFor(async () => {
      const history = await getHistory(server.ctx)
      const assistant = history.messages.find(m => m.id === assistantId)
      expect(assistant?.streamId).toBeUndefined()
    })

    const history = await getHistory(server.ctx)
    expect(history.messages).toHaveLength(2)
    expect(history.messages[0]).toMatchObject({
      id: userId,
      role: 'user',
      content: 'Tell me about devframe.',
    })
    expect(history.messages[1]).toMatchObject({
      id: assistantId,
      role: 'assistant',
      content: fullText,
    })
  })

  it('persists history across multiple turns', async () => {
    const client = bootClient(server.port)
    await new Promise(r => setTimeout(r, 50))

    for (const prompt of ['hi', 'How does streaming work?', 'Write a haiku about RPC.']) {
      const { streamId } = await send(client, prompt)
      await readAll(client.streaming.subscribe<string>(CHANNEL, streamId))
    }
    await new Promise(r => setTimeout(r, 50))

    const history = await getHistory(server.ctx)
    expect(history.messages).toHaveLength(6)
    expect(history.messages.map(m => m.role)).toEqual([
      'user',
      'assistant',
      'user',
      'assistant',
      'user',
      'assistant',
    ])
    expect(history.messages.every(m => !m.streamId)).toBe(true)
  })

  it('cancellation marks the assistant message and saves partial content', async () => {
    const client = bootClient(server.port)
    await new Promise(r => setTimeout(r, 50))

    const { assistantId, streamId } = await send(client, 'Tell me about devframe.', 30)
    const reader = client.streaming.subscribe<string>(CHANNEL, streamId)

    const collected: string[] = []
    for await (const token of reader) {
      collected.push(token)
      if (collected.length >= 3)
        reader.cancel()
    }

    await vi.waitFor(async () => {
      const history = await getHistory(server.ctx)
      const assistant = history.messages.find(m => m.id === assistantId)
      expect(assistant?.cancelled).toBe(true)
    })

    const history = await getHistory(server.ctx)
    const assistant = history.messages.find(m => m.id === assistantId)!
    expect(assistant.streamId).toBeUndefined()
    expect(assistant.content.length).toBeGreaterThan(0)
    // Partial content — the canned "devframe" response is well over 200 chars.
    expect(assistant.content.length).toBeLessThan(200)
  })

  it('clears history on demand', async () => {
    const client = bootClient(server.port)
    await new Promise(r => setTimeout(r, 50))

    const { streamId } = await send(client, 'Tell me about devframe.')
    await readAll(client.streaming.subscribe<string>(CHANNEL, streamId))
    await new Promise(r => setTimeout(r, 30))

    expect((await getHistory(server.ctx)).messages).toHaveLength(2)

    await (client.rpc as any).$call('devframe-streaming-chat:clear')
    await new Promise(r => setTimeout(r, 30))

    expect((await getHistory(server.ctx)).messages).toHaveLength(0)
  })

  it('replays buffered tokens for a late subscriber', async () => {
    const client = bootClient(server.port)
    await new Promise(r => setTimeout(r, 50))

    const { streamId } = await send(client, 'Tell me about devframe.', 5)

    // Wait for the producer to finish before subscribing.
    await new Promise(r => setTimeout(r, 600))

    const collected = await readAll(client.streaming.subscribe<string>(CHANNEL, streamId))
    expect(collected.length).toBeGreaterThan(5)
    expect(collected.join('')).toContain('You asked')
  })
})
