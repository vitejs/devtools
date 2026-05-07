# devframe-streaming-chat

End-to-end demo of devframe's streaming-channel API. Mirrors the AI-deltas
use case from [vitejs/devtools#306](https://github.com/vitejs/devtools/issues/306):
the server emits synthesized "tokens" one at a time, and the browser renders
them incrementally with `for await`.

## What it shows

- `ctx.rpc.streaming.create(name, opts)` registers a streaming channel.
- An `action` RPC starts a stream and returns its `streamId`.
- The client calls `rpc.streaming.subscribe(name, id)` and consumes via
  `for await (const token of reader)`.
- `reader.cancel()` aborts the server-side `stream.signal` so the producer
  exits cleanly mid-stream.
- Reopening the panel mid-stream replays buffered tokens (replayWindow: 256).

## Run it

```sh
pnpm -C devframe/examples/devframe-streaming-chat run build
pnpm -C devframe/examples/devframe-streaming-chat run dev
```

Then open http://localhost:9897/ and pick a demo prompt, or type your own.

## Run the tests

```sh
pnpm -C devframe/examples/devframe-streaming-chat run test
```

Tests boot the server in-process and exercise the full WS round-trip:
happy path, cancellation, fan-out across two clients, and replay-after-resubscribe.
