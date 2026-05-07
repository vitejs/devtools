---
outline: deep
---

# Streaming

Devframe's streaming-channel API provides server→client push for chunk-style data — chat deltas, log lines, build progress, anything you'd otherwise express as a sequence of fire-and-forget events. It builds on the same WebSocket transport as the rest of the RPC layer, but adds the conventions every chunked feed needs: stream IDs, cooperative cancellation, replay on reconnect, and first-class **Web Streams** interop.

For the common case of "I have an `async function*` and I want to ship its yields to the client", reach for [Async Generator RPC](#async-generator-rpc) below — it auto-allocates the sink, wires cancellation, and the client receives a ready-to-iterate `StreamReader<Y>` from `rpc.call(...)`. Drop down to the lower-level channel API in this guide when you need fan-out, late-replay across multiple subscribers, or client-to-server uploads.

## Overview

```mermaid
sequenceDiagram
  participant Producer as Producer (server)
  participant Channel as ctx.rpc.streaming<br/>channel
  participant Browser as Subscriber (browser)

  Producer->>Channel: start({ id })
  Channel-->>Browser: chunk(seq=1, "...")
  Channel-->>Browser: chunk(seq=2, "...")
  Producer->>Channel: close()
  Channel-->>Browser: end()
```

A **channel** owns a wire namespace. Each call to `channel.start()` produces an individual **stream** keyed by an id (auto-generated unless you pass one). Subscribers join by `(channelName, id)`.

## Defining a Channel

In your `setup`, create the channel once. Channels are framework-neutral, so the same code works for `cli`, `vite`, `kit`, and `embedded` adapters:

```ts
import { defineDevtool, defineRpcFunction } from 'devframe'
import * as v from 'valibot'

export default defineDevtool({
  id: 'my-devtool',
  name: 'My Devtool',
  async setup(ctx) {
    const channel = ctx.rpc.streaming.create<string>('my-devtool:chat', {
      replayWindow: 256,
    })

    ctx.rpc.register(defineRpcFunction({
      name: 'my-devtool:start-chat',
      type: 'action',
      jsonSerializable: true,
      args: [v.object({ prompt: v.string() })],
      returns: v.object({ streamId: v.string() }),
      handler: async ({ prompt }) => {
        const stream = channel.start()
        ;(async () => {
          for await (const token of fakeLLM(prompt, { signal: stream.signal })) {
            stream.write(token)
          }
          stream.close()
        })()
        return { streamId: stream.id }
      },
    }))
  },
})
```

The channel name follows the same `<plugin-id>:<name>` convention as RPC functions.

## Producing — Three Surfaces, One Stream

The handle returned by `channel.start({ id? })` is both an imperative producer and a Web Streams `WritableStream<T>`:

```ts
const stream = channel.start({ id: 'optional-explicit-id' })

// Imperative — minimal, hand-rolled producers
stream.write(chunk)
stream.error(err) // terminal failure
stream.close() // terminal success
stream.signal // AbortSignal — flips when consumers cancel
stream.id // string — what clients subscribe to

// Web Streams — pipe any ReadableStream<T> in:
sourceReadable.pipeTo(stream.writable, { signal: stream.signal })

// Convenience — start + pipe in one call:
const stream = await channel.pipeFrom(sourceReadable)
```

Producers should poll `stream.signal.aborted` and exit cooperatively when it flips:

```ts
for (const token of source) {
  if (stream.signal.aborted)
    return
  stream.write(token)
}
stream.close()
```

### Node.js Stream Interop

Web Streams are the canonical surface, but Node 17+ ships free converters that bridge to `node:stream`:

```ts
import { Readable, Writable } from 'node:stream'

// Pipe a Node Readable into the streaming channel
sourceNodeReadable.pipe(Writable.fromWeb(stream.writable))

// Pipe the channel out to a Node Writable
Readable.fromWeb(reader.readable).pipe(targetNodeWritable)
```

Devframe doesn't wrap these — they're standard library, and the surface stays small.

## Consuming — `for await` or `pipeTo`

The client returns a reader that's both an `AsyncIterable<T>` and exposes a `ReadableStream<T>`:

```ts
import { connectDevtool } from 'devframe/client'

const rpc = await connectDevtool()
const { streamId } = await rpc.call('my-devtool:start-chat', {
  prompt: 'Hello',
})

const reader = rpc.streaming.subscribe<string>('my-devtool:chat', streamId)

// Async iterable — the simplest consumer pattern
for await (const token of reader)
  appendToken(token)

// Or pipe to a DOM-side WritableStream
await reader.readable.pipeTo(downloadWritable)

reader.cancel() // sends cancel upstream; server stream.signal flips
```

Pick one surface per reader — they share a single internal queue, so concurrent draining will race.

## Lifecycle and Cancellation

| Event | Server side | Client side |
|-------|-------------|-------------|
| Producer calls `stream.close()` / `stream.error(err)` | Broadcasts `end` to subscribers | `for await` resolves (success) or throws (error) |
| Consumer calls `reader.cancel()` | Server's `stream.signal` aborts when the **last** subscriber cancels — handlers should poll and exit | Reader marks itself cancelled; `for await` ends without iterating |
| WS disconnects | When the **last** subscriber drops, server aborts `stream.signal` | Reader stays alive; resubscribes automatically when trust is re-established |
| `chat` panel closes mid-stream | Reader cancel cascades upstream | — |

A stream with multiple subscribers stays alive until the last one cancels or disconnects. Producers should always make `stream.signal.aborted` part of their inner loop.

## Client-to-Server Uploads

The same channel works in reverse for chunk-style uploads — file content, mic / screen-share frames, browser-side logs forwarded to disk, anything you'd otherwise hand-roll as `multipart` over HTTP. The pattern uses one normal RPC call to allocate the id, then dedicated streaming events for the chunks:

```ts
// Server — typically inside an action handler
ctx.rpc.register(defineRpcFunction({
  name: 'my-devtool:upload-file',
  type: 'action',
  args: [v.object({ name: v.string() })],
  returns: v.object({ uploadId: v.string() }),
  handler: async ({ name }) => {
    const reader = channel.openInbound()

    // Process chunks asynchronously — the action returns immediately
    // so the client can start uploading.
    ;(async () => {
      const file = createWriteStream(name)
      for await (const chunk of reader)
        file.write(chunk)
      file.close()
    })()

    return { uploadId: reader.id }
  },
}))
```

```ts
// Client
const { uploadId } = await rpc.call('my-devtool:upload-file', {
  name: 'capture.bin',
})
const upload = rpc.streaming.upload<Uint8Array>('my-devtool:files', uploadId)

// Imperative
upload.write(chunk1)
upload.write(chunk2)
upload.close()

// Or pipe a Web ReadableStream straight in:
fileReadable.pipeTo(upload.writable, { signal: upload.signal })
```

Lifecycle mirrors the outbound case:

- `upload.signal` aborts when the **server** calls `reader.cancel()` (the server cancellation broadcasts an `upload-cancel` to the uploading session).
- `upload.error(err)` propagates as a thrown error inside the server's `for await`.
- If the client disconnects mid-upload, the server's `for await` exits with an `UploadDisconnected` error so consumers can clean up.

Each `openInbound()` allocates a fresh server-allocated id and is owned by exactly one uploading session — there's no fan-in, no shared subscribers, and no replay (the producer is the client, so reconnect means restart).

## Replay on Reconnect

When the channel is created with `replayWindow: N`, the server keeps a rolling buffer of the last `N` chunks per stream. On (re)subscribe, the client passes the highest sequence number it has seen, and the server replays anything newer before resuming live.

```ts
ctx.rpc.streaming.create<string>('my-devtool:chat', {
  replayWindow: 256, // chunks to retain per stream id
  closedStreamRetention: 30_000, // ms to hold closed streams for late subscribers
})
```

`closedStreamRetention` defaults to 30 seconds when `replayWindow > 0` (so a panel re-opened a few seconds after a chat finishes still gets the full transcript), or 0 when replay is disabled. Set it explicitly to opt in or out.

## Backpressure

The client maintains a bounded queue per subscription (`highWaterMark`, default 256). When the consumer can't keep up, the **oldest** queued chunk is dropped and a [`DF0029`](../errors/DF0029) warning is logged. This is best-effort — proper transport-level backpressure isn't worth threading through birpc for the streaming use cases that exist today.

```ts
const reader = rpc.streaming.subscribe('my-devtool:chat', id, {
  highWaterMark: 1024, // raise if you expect bursts the consumer can recover from
})
```

If you need authoritative state rather than every intermediate value, prefer [shared state](./shared-state) — it carries Immer patches with delivery guarantees, at the cost of being structured rather than streaming.

## When to Use Streaming vs Events vs Shared State

| Use streaming for | Use `event`-typed RPC for | Use shared state for |
|-------------------|---------------------------|----------------------|
| Token / chunk feeds (LLM deltas, build logs) | Notifications without payload (`refresh`, `clear`) | Long-lived UI state (selections, panel layout) |
| Per-call lifecycles with cancellation | Cross-cutting signals broadcast to all clients | Reactive snapshots that survive reconnect |
| Replay on reconnect | Fire-and-forget signaling | Diff-based sync between clients |
| Client-to-server uploads (files, mic frames) | | |

## Async Generator RPC

The streaming-channel API is the foundation; the most common shape — "stream the yields of an `async function*` to the caller" — has a higher-level wrapper that hides the channel altogether.

### Defining a generator

Set `type: 'generator'` on `defineRpcFunction` and write the handler as `async function*`:

```ts
import { defineRpcFunction } from 'devframe'
import { getCurrentRpcStream } from 'devframe/node'
import * as v from 'valibot'

defineRpcFunction({
  name: 'my-devtool:chat',
  type: 'generator',
  args: [v.object({ prompt: v.string() })],
  yields: v.string(),
  async* handler({ prompt }) {
    const { signal } = getCurrentRpcStream()!
    for (const token of fakeTokens(prompt)) {
      if (signal.aborted)
        return
      yield token
    }
  },
})
```

`getCurrentRpcStream()` is `AsyncLocalStorage`-backed (mirrors `getCurrentRpcSession()`); inside the generator body it returns `{ signal, streamId, session }`. Outside, it returns `undefined`. Poll `signal.aborted` and exit cooperatively when the consumer cancels.

### Calling from the client

```ts
import { connectDevtool } from 'devframe/client'

const rpc = await connectDevtool()
const reader = await rpc.call('my-devtool:chat', { prompt: 'Hi' })

for await (const token of reader)
  appendToken(token)

// or pipe out as a Web Stream:
await reader.readable.pipeTo(downloadWritable)

reader.cancel() // sends cancel upstream; server's `signal` flips
```

`rpc.call` resolves to `Promise<StreamReader<Y>>` for generator-typed functions. The reader is the same shape as `rpc.streaming.subscribe()` — it's both `AsyncIterable<Y>` and exposes `.readable: ReadableStream<Y>`. Pick one surface per reader (they share an internal queue).

### Per-function options

| Field | Default | Effect |
|-------|---------|--------|
| `yields` | — | Valibot schema for each yielded value. Optional; required if `args` is set ([`DF0035`](../errors/DF0035)). Drives client-side type inference of `StreamReader<Y>`. |
| `replayWindow` | `256` | Per-stream ring-buffer size. Floored to `1` — the client subscribe lands a few ms after the wrapper allocates the sink, so early yields must be replayable. |
| `closedStreamRetention` | `30_000` | Milliseconds the stream is held open for late subscribers after the producer closes. Mirrors the channel-level option. |

### Local invocation

Server-side callers can iterate a generator without paying for the streaming round-trip:

```ts
import { invokeLocalGenerator } from 'devframe/node'

for await (const token of await invokeLocalGenerator<string>(rpc, 'my-devtool:chat', { prompt: 'Hi' })) {
  // process tokens directly — no transport, no sink allocation
}
```

`invokeLocalGenerator` returns the bare `AsyncIterable<Y>` from the user's handler. `getCurrentRpcStream()` returns `undefined` in this path (no stream, no signal).

### What you can't put on a generator

- `agent: { ... }` — streaming-MCP exposure is deferred. ([`DF0033`](../errors/DF0033))
- `cacheable: true` — caching a streaming response would replay a stale `streamId`. ([`DF0036`](../errors/DF0036))
- `jsonSerializable: true` — chunks always travel via `structured-clone` regardless. ([`DF0036`](../errors/DF0036))
- `dump`, `snapshot` — streaming results don't have a "snapshot" semantics. ([`DF0027`](../errors/DF0027), [`DF0028`](../errors/DF0028))

### When to reach for the lower-level channel API

Generator RPC covers the 90% case. Drop down to `ctx.rpc.streaming.create(...)` directly when you need:

- **Fan-out** — multiple subscribers seeing the same stream from a single producer. Generator RPC allocates a fresh stream per call.
- **Long-running side-channel streams** — terminal output, file watches, anything that lives beyond a single RPC call.
- **Client-to-server uploads** — `channel.openInbound()` with a paired action handler to allocate the id (see [Client-to-Server Uploads](#client-to-server-uploads)).

## Reference

- API surface: `RpcStreamingHost`, `RpcStreamingChannel<T>`, `StreamSink<T>`, `StreamReader<T>` in `devframe/types`. Generator RPC: `getCurrentRpcStream`, `invokeLocalGenerator` in `devframe/node`.
- Working example: [`devframe/examples/devframe-streaming-chat`](https://github.com/vitejs/devtools/tree/main/devframe/examples/devframe-streaming-chat) — `:send` uses the channel API directly, `:tokenize` uses generator RPC.
- Errors: [`DF0029`](../errors/DF0029) (overflow), [`DF0030`](../errors/DF0030) (unknown stream id), [`DF0031`](../errors/DF0031) (write to closed stream), [`DF0032`](../errors/DF0032) (channel name collision), [`DF0033`](../errors/DF0033) (generator + agent), [`DF0034`](../errors/DF0034) (handler not async-iterable), [`DF0035`](../errors/DF0035) (generator missing yields), [`DF0036`](../errors/DF0036) (inapplicable generator option).
