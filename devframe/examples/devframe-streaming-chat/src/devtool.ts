import { fileURLToPath } from 'node:url'
import { defineRpcFunction } from 'devframe'
import { defineDevtool } from 'devframe/types'
import * as v from 'valibot'

const BASE_PATH = '/.devframe-streaming-chat/'
const distDir = fileURLToPath(new URL('../dist/client', import.meta.url))

const CHANNEL_NAME = 'devframe-streaming-chat:tokens'

const DEMO_PROMPTS = [
  'Tell me about devframe.',
  'How does streaming work?',
  'Write a haiku about RPC.',
] as const

/**
 * Synthetic "AI" — splits a fake response into tokens and emits one
 * every `intervalMs` milliseconds. Replaceable with any real provider
 * (OpenAI SDK's `stream: true` returns an async iterable that pipes
 * straight into `channel.pipeFrom(Readable.toWeb(stream))`).
 */
function* fakeTokens(prompt: string): Generator<string> {
  const lower = prompt.toLowerCase()
  let response: string
  if (lower.includes('haiku')) {
    response = 'Tiny chunks arrive — / type-safe over WebSocket / streams compose with ease.'
  }
  else if (lower.includes('streaming')) {
    response
      = 'Streams start with `ctx.rpc.streaming.create()` on the server. '
        + 'Producers `write()` chunks; clients subscribe and consume them via '
        + '`for await (const chunk of reader)`. Cancellation, replay, and '
        + 'backpressure are wired by the host — your handler stays small.'
  }
  else {
    response
      = `You asked: "${prompt}". `
        + 'devframe is a framework-neutral foundation for building developer '
        + 'tooling — six adapters, type-safe RPC, shared state, and now a '
        + 'first-class streaming channel for delta-style server→client data. '
        + 'Pipe `ReadableStream`s directly into a sink, or write chunks by hand.'
  }
  // Split on whitespace but keep the spaces so `output.join('')` round-trips.
  const tokens = response.split(/(\s+)/).filter(Boolean)
  for (const token of tokens) yield token
}

export default defineDevtool({
  id: 'devframe-streaming-chat',
  name: 'Streaming Chat',
  icon: 'ph:chat-circle-dots-duotone',
  basePath: BASE_PATH,
  cli: {
    command: 'devframe-streaming-chat',
    port: 9897,
    distDir,
  },
  spa: { loader: 'none' },
  async setup(ctx) {
    // Create the streaming channel up-front so demo prompts can reuse it.
    const channel = ctx.rpc.streaming.create<string>(CHANNEL_NAME, {
      replayWindow: 256,
    })

    ctx.rpc.register(defineRpcFunction({
      name: 'devframe-streaming-chat:demo-prompts',
      type: 'static',
      jsonSerializable: true,
      handler: () => ({ prompts: [...DEMO_PROMPTS] }),
    }))

    ctx.rpc.register(defineRpcFunction({
      name: 'devframe-streaming-chat:start',
      type: 'action',
      jsonSerializable: true,
      args: [v.object({
        prompt: v.string(),
        intervalMs: v.optional(v.number(), 40),
      })],
      returns: v.object({ streamId: v.string() }),
      handler: async ({ prompt, intervalMs = 40 }) => {
        const stream = channel.start()

        // Producer task — fire-and-forget. Each chunk goes out the channel;
        // we cooperate with cancellation by polling `stream.signal.aborted`.
        ;(async () => {
          try {
            for (const token of fakeTokens(prompt)) {
              if (stream.signal.aborted)
                return
              stream.write(token)
              await new Promise(r => setTimeout(r, intervalMs))
            }
            stream.close()
          }
          catch (err) {
            stream.error(err)
          }
        })()

        return { streamId: stream.id }
      },
    }))

    ctx.views.hostStatic(BASE_PATH, distDir)
    ctx.docks.register({
      id: 'devframe-streaming-chat',
      title: 'Streaming Chat',
      icon: 'ph:chat-circle-dots-duotone',
      type: 'iframe',
      url: BASE_PATH,
    })
  },
})
