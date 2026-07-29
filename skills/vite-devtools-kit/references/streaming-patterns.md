# Streaming Patterns

Chunk-style server↔client data flow with cancellation, replay, and Web Streams interop. Use streaming when a feature is *delta-shaped* (LLM tokens, log lines, build progress, file uploads, mic frames). Use [shared state](./shared-state-patterns.md) when the feature is *snapshot-shaped* (selections, panel layout, cached lists).

## Core API

```ts
// Server (in devtools.setup)
const channel = ctx.rpc.streaming.create<TChunk>('my-plugin:tokens', {
  replayWindow: 256, // chunks retained per stream id
  closedStreamRetention: 30_000, // ms to hold finished streams for late subscribers
})

// Client
const reader = rpc.streaming.subscribe<TChunk>(channelName, streamId)
```

A **channel** owns a wire namespace. Each `channel.start()` produces an individual **stream** keyed by an id.

## Server-to-Client (Server Produces)

### Action that returns a stream id

The typical pattern: a normal action allocates the id, kicks off a background producer, and returns the id so the client can subscribe.

```ts
import { defineRpcFunction } from '@vitejs/devtools-kit'
import * as v from 'valibot'

ctx.rpc.register(defineRpcFunction({
  name: 'my-plugin:start-chat',
  type: 'action',
  jsonSerializable: true,
  args: [v.object({ prompt: v.string() })],
  returns: v.object({ streamId: v.string() }),
  handler: async ({ prompt }) => {
    const stream = channel.start()
    ;(async () => {
      try {
        for await (const token of someLLM(prompt, { signal: stream.signal })) {
          if (stream.signal.aborted)
            break
          stream.write(token)
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
```

### Three producer surfaces, one stream

```ts
const stream = channel.start({ id: 'optional-explicit-id' })

// Imperative
stream.write(chunk)
stream.error(err) // terminal failure
stream.close() // terminal success
stream.signal // AbortSignal — flips when consumers cancel
stream.id // string — what clients subscribe to

// Web Streams — pipe any ReadableStream<T> in:
sourceReadable.pipeTo(stream.writable, { signal: stream.signal })

// One-call shortcut:
const stream2 = await channel.pipeFrom(sourceReadable)
```

### Two consumer surfaces, one reader

```ts
const reader = rpc.streaming.subscribe<string>('my-plugin:tokens', streamId)

// Async iterable — simplest pattern
for await (const token of reader)
  appendToken(token)

// Or pipe to a DOM-side WritableStream
await reader.readable.pipeTo(downloadWritable)

reader.cancel() // server stream.signal aborts
```

Pick one surface per reader — they share a single internal queue, so concurrent draining will race.

## Client-to-Server Uploads (Client Produces)

The same channel exposes `openInbound()` for the server side of an upload. Pair it with a normal action that returns the id:

```ts
ctx.rpc.register(defineRpcFunction({
  name: 'my-plugin:upload-file',
  type: 'action',
  args: [v.object({ name: v.string() })],
  returns: v.object({ uploadId: v.string() }),
  handler: async ({ name }) => {
    const reader = channel.openInbound()
    ;(async () => {
      const file = createWriteStream(name)
      try {
        for await (const chunk of reader)
          file.write(chunk)
      }
      finally {
        file.close()
      }
    })()
    return { uploadId: reader.id }
  },
}))
```

```ts
// Client
const { uploadId } = await rpc.call('my-plugin:upload-file', { name: 'capture.bin' })
const upload = rpc.streaming.upload<Uint8Array>('my-plugin:files', uploadId)

// Imperative
upload.write(chunk1)
upload.write(chunk2)
upload.close()

// Web Streams
fileReadable.pipeTo(upload.writable, { signal: upload.signal })
```

Lifecycle:

- `upload.signal` aborts when the server calls `reader.cancel()` (server cancellation broadcasts an `upload-cancel` to the uploading session).
- `upload.error(err)` propagates as a thrown error inside the server's `for await`.
- Client disconnect surfaces as `UploadDisconnected` in the server's `for await`.

Each `openInbound()` is owned by one uploading session — no fan-in.

## Lifecycle Reference

| Event | Server side | Client side |
|-------|-------------|-------------|
| `stream.close()` / `stream.error(err)` | broadcasts `end` to subscribers | `for await` resolves / throws |
| `reader.cancel()` (last subscriber) | `stream.signal` aborts | reader marked cancelled |
| WS disconnect (last subscriber drops) | `stream.signal` aborts | reader auto-resubscribes after re-trust |

Producers should always poll `stream.signal.aborted` and exit cooperatively.

## Replay on Reconnect

Set `replayWindow: N` to keep the last N chunks per stream. On (re)subscribe, the client passes the highest `seq` it has seen, and the server replays anything newer before resuming live:

```ts
const channel = ctx.rpc.streaming.create<string>('my-plugin:tokens', {
  replayWindow: 1024,
  closedStreamRetention: 30_000, // hold finished streams for late subscribers
})
```

`closedStreamRetention` defaults to 30 seconds when `replayWindow > 0`, or 0 when replay is disabled.

## Backpressure

Client maintains a bounded queue per subscription (`highWaterMark`, default 256). Overflow drops the **oldest** chunk and emits a `DF0029` warning:

```ts
rpc.streaming.subscribe('my-plugin:tokens', id, { highWaterMark: 1024 })
```

If you need authoritative state rather than every intermediate value, prefer shared state.

## Web / Node Streams Interop

Web Streams are the canonical surface. Node 17+ ships free converters:

```ts
import { Readable, Writable } from 'node:stream'

// Pipe a Node Readable into the streaming channel
sourceNodeReadable.pipe(Writable.fromWeb(stream.writable))

// Pipe the channel out to a Node Writable
Readable.fromWeb(reader.readable).pipe(targetNodeWritable)
```

DevTools Kit doesn't wrap these — they're standard library.

## Combining Streaming with Shared State

For chat-style UIs that need both real-time deltas AND persistent history, compose the two primitives:

- The **conversation log** lives in shared state — survives reloads, syncs across panels.
- Active responses use a **streaming channel** for low-latency rendering.
- The action that starts a response appends a placeholder to shared state, kicks off the producer, and on producer close commits the joined content back to shared state.

```ts
const tokens = ctx.rpc.streaming.create<string>('my-plugin:chat-tokens', {
  replayWindow: 1024,
})
const history = await ctx.rpc.sharedState.get('my-plugin:chat-history', {
  initialValue: { messages: [] as ChatMessage[] },
})

ctx.rpc.register(defineRpcFunction({
  name: 'my-plugin:send',
  type: 'action',
  args: [v.object({ prompt: v.string() })],
  returns: v.object({ streamId: v.string(), assistantId: v.string() }),
  handler: async ({ prompt }) => {
    const stream = tokens.start()
    const assistantId = crypto.randomUUID()

    history.mutate((draft) => {
      draft.messages.push({ id: crypto.randomUUID(), role: 'user', content: prompt })
      draft.messages.push({
        id: assistantId,
        role: 'assistant',
        content: '',
        streamId: stream.id,
      })
    })

    let acc = ''
    ;(async () => {
      for await (const token of someLLM(prompt, { signal: stream.signal })) {
        if (stream.signal.aborted)
          break
        stream.write(token)
        acc += token
      }
      stream.close()
      history.mutate((draft) => {
        const msg = draft.messages.find(m => m.id === assistantId)
        if (msg) {
          msg.content = acc
          msg.streamId = undefined
        }
      })
    })()

    return { streamId: stream.id, assistantId }
  },
}))
```

Working example: [`devframe/examples/devframe-streaming-chat`](https://github.com/vitejs/devtools/tree/main/devframe/examples/devframe-streaming-chat) — Preact UI rendering messages from shared state, with live token overlays for in-flight assistant responses.

## When to Use Streaming vs Events vs Shared State

| Streaming | `event`-typed RPC | Shared state |
|-----------|-------------------|--------------|
| Token / chunk feeds (LLM deltas, build logs) | Notifications without payload (`refresh`, `clear`) | Long-lived UI state (selections, panel layout) |
| Per-call lifecycles with cancellation | Cross-cutting signals to all clients | Reactive snapshots that survive reconnect |
| Replay on reconnect | Fire-and-forget signaling | Diff-based sync between clients |
| Client-to-server uploads | | |

## Errors

- [`DF0029`](https://devfra.me/errors/DF0029) — buffer overflow (consumer too slow)
- [`DF0030`](https://devfra.me/errors/DF0030) — unknown stream id
- [`DF0031`](https://devfra.me/errors/DF0031) — write to closed stream
- [`DF0032`](https://devfra.me/errors/DF0032) — channel name collision
