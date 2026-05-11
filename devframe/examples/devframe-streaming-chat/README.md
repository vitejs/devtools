# devframe-streaming-chat

End-to-end demo of devframe's streaming-channel API combined with shared
state for persistent chat history. Mirrors the AI-deltas use case from
[vitejs/devtools#306](https://github.com/vitejs/devtools/issues/306):
the server emits synthesized "tokens" one at a time over a streaming
channel, while the conversation log lives in a devframe `sharedState` so
it survives reloads, syncs across panels, and replays cleanly when a
client (re)joins mid-stream.

## What it shows

- `ctx.rpc.streaming.create(name, opts)` registers a streaming channel.
- `ctx.rpc.sharedState.get('devframe-streaming-chat:history', …)` keeps
  the message log on the server. Each `send` action appends a user +
  assistant pair atomically.
- The producer streams tokens via the channel for low-latency rendering,
  then commits the joined content back to the shared state when it's
  done — so refreshes and new clients see the finished message
  immediately.
- `reader.cancel()` aborts mid-stream; the assistant message is marked
  `cancelled: true` with whatever content was accumulated.
- `replayWindow: 1024` means a panel reopened mid-stream replays the
  buffered tokens before resuming live.

## Run it

```sh
pnpm -C devframe/examples/devframe-streaming-chat run build
pnpm -C devframe/examples/devframe-streaming-chat run dev
```

Then open http://localhost:9897/ — type a prompt, watch tokens stream
in, refresh the page mid-conversation, cancel a long answer, click
**Clear** to wipe the log.

## Run the tests

```sh
pnpm -C devframe/examples/devframe-streaming-chat run test
```

Tests boot the server in-process and exercise the full WS round-trip:
happy path with shared-state commit, multi-turn history, cancellation
with partial content, clear, and replay-after-finish.

## Wire it to a real LLM

Replace `fakeTokens(prompt)` in `src/devframe.ts` with anything that
yields strings — the rest of the example doesn't care. For OpenAI:

```ts
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  stream: true,
  messages: [{ role: 'user', content: prompt }],
})
for await (const chunk of response) {
  if (stream.signal.aborted)
    break
  const token = chunk.choices[0]?.delta?.content
  if (token) {
    stream.write(token)
    acc += token
  }
}
stream.close()
```

`stream.signal` propagates cancellation from the browser → server →
`openai.chat.completions.create`'s own AbortController, so cancelling
also stops the upstream request.
