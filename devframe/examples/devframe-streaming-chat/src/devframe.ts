import { fileURLToPath } from 'node:url'
import { defineRpcFunction } from 'devframe'
import { defineDevframe } from 'devframe/types'
import { nanoid } from 'devframe/utils/nanoid'
import * as v from 'valibot'

const BASE_PATH = '/__devframe-streaming-chat/'
const distDir = fileURLToPath(new URL('../dist/client', import.meta.url))

const CHANNEL_NAME = 'devframe-streaming-chat:tokens'
const HISTORY_KEY = 'devframe-streaming-chat:history'
const MAX_HISTORY = 200

const DEMO_PROMPTS = [
  'Tell me about devframe.',
  'How does streaming work?',
  'Write a haiku about RPC.',
] as const

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  /** Set on assistant messages while their stream is in flight. */
  streamId?: string
  /** True if the assistant stream was cancelled before completing. */
  cancelled?: boolean
  timestamp: number
}

export interface ChatHistory {
  messages: ChatMessage[]
}

declare module 'devframe/types' {
  interface DevToolsRpcSharedStates {
    [HISTORY_KEY]: ChatHistory
  }
}

/**
 * Synthetic "AI" — splits a canned response into tokens and emits them
 * one at a time. Swap in `OpenAI`'s `chat.completions.create({ stream: true })`
 * (or any async iterable of strings) to make it real.
 */
function* fakeTokens(prompt: string): Generator<string> {
  const lower = prompt.toLowerCase()
  let response: string
  if (/^(?:hi|hello|hey)\b/.test(lower)) {
    response = `Hello! Ask me about devframe, streaming, or anything else — I'll fake-stream a response one token at a time.`
  }
  else if (lower.includes('haiku')) {
    response = 'Tiny chunks arrive — / type-safe over WebSocket / streams compose with ease.'
  }
  else if (lower.includes('streaming')) {
    response
      = 'Streams start with `ctx.rpc.streaming.create()` on the server. '
        + 'Producers `write()` chunks; clients subscribe and consume them via '
        + '`for await (const chunk of reader)`. Cancellation, replay, and '
        + 'backpressure are wired by the host — your handler stays small.'
  }
  else if (lower.includes('history') || lower.includes('persist')) {
    response
      = `History lives in a devframe shared state ("${HISTORY_KEY}"). `
        + 'Each `send` appends a user + assistant pair; tokens stream live, '
        + 'and the final content is committed back to the shared state when '
        + 'the producer closes. Refresh the page and the log comes back.'
  }
  else {
    response
      = `You asked: "${prompt}". `
        + 'devframe is a framework-neutral foundation for building developer '
        + 'tooling — six adapters, type-safe RPC, shared state, and a '
        + 'first-class streaming channel for delta-style server↔client data. '
        + 'Pipe `ReadableStream`s into a sink, or write chunks by hand.'
  }
  // Split on whitespace but keep the spaces so `tokens.join('')` round-trips.
  const tokens = response.split(/(\s+)/).filter(Boolean)
  for (const token of tokens) yield token
}

export default defineDevframe({
  id: 'devframe-streaming-chat',
  name: 'Streaming Chat',
  icon: 'ph:chat-circle-dots-duotone',
  basePath: BASE_PATH,
  cli: {
    command: 'devframe-streaming-chat',
    port: 9897,
    distDir,
    // Single-user localhost demo — skip the trust handshake that the
    // Vite-side surface requires.
    auth: false,
  },
  spa: { loader: 'none' },
  async setup(ctx) {
    const channel = ctx.rpc.streaming.create<string>(CHANNEL_NAME, {
      replayWindow: 1024,
    })

    const history = await ctx.rpc.sharedState.get(HISTORY_KEY, {
      initialValue: { messages: [] },
    })

    function pruneIfTooLarge(): void {
      if (history.value().messages.length > MAX_HISTORY) {
        history.mutate((draft) => {
          draft.messages.splice(0, draft.messages.length - MAX_HISTORY)
        })
      }
    }

    ctx.rpc.register(defineRpcFunction({
      name: 'devframe-streaming-chat:demo-prompts',
      type: 'static',
      jsonSerializable: true,
      handler: () => ({ prompts: [...DEMO_PROMPTS] }),
    }))

    ctx.rpc.register(defineRpcFunction({
      name: 'devframe-streaming-chat:send',
      type: 'action',
      jsonSerializable: true,
      args: [v.object({
        prompt: v.string(),
        intervalMs: v.optional(v.number(), 35),
      })],
      returns: v.object({
        userId: v.string(),
        assistantId: v.string(),
        streamId: v.string(),
      }),
      handler: async ({ prompt, intervalMs = 35 }) => {
        const stream = channel.start()
        const userId = nanoid()
        const assistantId = nanoid()
        const now = Date.now()

        // Append both messages atomically — clients see the user prompt
        // and the empty assistant placeholder appear together.
        history.mutate((draft) => {
          draft.messages.push({
            id: userId,
            role: 'user',
            content: prompt,
            timestamp: now,
          })
          draft.messages.push({
            id: assistantId,
            role: 'assistant',
            content: '',
            streamId: stream.id,
            timestamp: now,
          })
        })
        pruneIfTooLarge()

        // Producer — token-by-token via streaming, full content committed
        // to shared state when done so refreshes / new clients see the
        // finished message without re-streaming.
        ;(async () => {
          let acc = ''
          let cancelled = false
          try {
            for (const token of fakeTokens(prompt)) {
              if (stream.signal.aborted) {
                cancelled = true
                break
              }
              stream.write(token)
              acc += token
              await new Promise(r => setTimeout(r, intervalMs))
            }
            if (!cancelled)
              stream.close()
          }
          catch (err) {
            stream.error(err)
            history.mutate((draft) => {
              const msg = draft.messages.find(m => m.id === assistantId)
              if (msg) {
                msg.content = acc
                msg.streamId = undefined
                msg.cancelled = true
              }
            })
            return
          }

          history.mutate((draft) => {
            const msg = draft.messages.find(m => m.id === assistantId)
            if (msg) {
              msg.content = acc
              msg.streamId = undefined
              if (cancelled)
                msg.cancelled = true
            }
          })
        })()

        return { userId, assistantId, streamId: stream.id }
      },
    }))

    ctx.rpc.register(defineRpcFunction({
      name: 'devframe-streaming-chat:clear',
      type: 'action',
      jsonSerializable: true,
      handler: () => {
        history.mutate((draft) => {
          draft.messages.length = 0
        })
      },
    }))
  },
})
