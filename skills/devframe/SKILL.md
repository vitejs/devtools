---
name: devframe
description: >
  Use when building devtools with devframe — the framework-neutral
  foundation that powers Vite DevTools. Covers DevtoolDefinition,
  picking the right adapter (cli / build / spa / vite / kit / embedded /
  mcp), designing RPC contracts, registering docks / commands / logs /
  terminals, exposing an agent-native surface over MCP, and wiring the
  author's SPA client. Triggers on `devframe` imports, `defineDevtool`,
  `createCli`, `createMcpServer`, `connectDevtool`, and on migrations of
  existing inspectors (eslint-config-inspector, unocss-inspector,
  node-modules-inspector-style tools) to devframe.
---

# devframe skill

A devtool built on devframe is a **single `DevtoolDefinition`** plus an author-provided SPA. Use one of seven adapters to ship it. `devframe` must not depend on Vite or any `@vitejs/*` package — it's the lowest-level layer in the monorepo, and the Kit / core packages build on top.

Full reference: [docs.devtools.vite.dev/devframe/](https://devtools.vite.dev/devframe/).

## When to use devframe

All adapter factories share the shape `createXxx(devtoolDef, options?)`.

| Author goal | Factory | Entry |
|-------------|---------|-------|
| Standalone CLI for local use | `createCli(def, options?)` | `devframe/adapters/cli` |
| Run the dev server programmatically (any CLI framework) | `createDevServer(def, options?)` | `devframe/adapters/dev` |
| Mount a SPA in an existing Vite dev server | `createVitePlugin(def, options?)` | `devframe/adapters/vite` |
| Self-contained static deploy with baked data | `createBuild(def, options?)` | `devframe/adapters/build` |
| Integrate into Vite DevTools | `createKitPlugin(def, options?)` | `devframe/adapters/kit` |
| Register dynamically at runtime | `createEmbedded(def, { ctx })` | `devframe/adapters/embedded` |
| Expose to coding agents (MCP) | `createMcpServer(def, options?)` | `devframe/adapters/mcp` *(experimental)* |

The same `DevtoolDefinition` runs under every adapter — pick based on deployment, not on what the tool does.

## Minimum viable devtool

```ts
import { defineDevtool, defineRpcFunction } from 'devframe'

export default defineDevtool({
  id: 'my-inspector',
  name: 'My Inspector',
  icon: 'ph:magnifying-glass-duotone',
  cli: { distDir: './client/dist' },
  setup(ctx) {
    ctx.rpc.register(defineRpcFunction({
      name: 'my-inspector:get-stats',
      type: 'static',
      handler: () => ({ count: 42 }),
    }))
    ctx.docks.register({
      id: 'my-inspector',
      title: 'My Inspector',
      icon: 'ph:magnifying-glass-duotone',
      type: 'iframe',
      url: '/.devtools/',
    })
  },
})
```

See `templates/counter-devtool.ts` for a runnable counter example, `templates/spa-devtool.ts` for an SPA-ready shape, and `templates/vite-client.ts` for the author's client entry.

## Namespacing

**Always prefix** RPC names, dock IDs, command IDs, shared-state keys, and agent tool IDs with the devtool `id`:

```ts
'my-inspector:get-modules'  // ✓
'my-inspector:state'        // ✓
'get-modules'               // ✗ — may collide with other devtools sharing the host
```

## DevToolsNodeContext at a glance

`setup(ctx)` receives the full server-side surface. Each host corresponds to a [docs](https://devtools.vite.dev/devframe/) page:

| Host | Purpose |
|------|---------|
| `ctx.rpc` | Register RPC functions, broadcast, shared state |
| `ctx.docks` | Dock entries (iframe / action / custom-render / launcher / json-render) |
| `ctx.views` | Serve static files via `hostStatic(base, distDir)` |
| `ctx.commands` | Command palette entries with keybindings + `when` gating |
| `ctx.messages` | Structured message entries, toasts, file / element positions |
| `ctx.diagnostics` | Structured diagnostics host (logs-sdk) — register custom error codes |
| `ctx.terminals` | Spawn and stream child processes |
| `ctx.agent` | Expose tools + resources to coding agents (experimental) |
| `ctx.host` | Runtime abstraction — `mountStatic`, `resolveOrigin` |
| `ctx.mode` | `'dev'` or `'build'` — gate setup work per runtime |

## RPC contracts

```ts
import { defineRpcFunction } from 'devframe'
import * as v from 'valibot'

const getModules = defineRpcFunction({
  name: 'my-inspector:get-modules',
  type: 'query',
  jsonSerializable: true,
  args: [v.object({ limit: v.number() })],
  returns: v.array(v.object({ id: v.string(), size: v.number() })),
  setup: ctx => ({
    handler: async ({ limit }) => loadModules().slice(0, limit),
  }),
})
```

| Type | Use when | Cached | Static dump |
|------|----------|--------|-------------|
| `'static'` | Data constant for a given input — dump at build time | Indefinitely | Automatic |
| `'query'`  | Read that may change; optional `dump` for build adapters | Opt-in via `cacheable` | Manual |
| `'action'` | Server-state mutation | Never | Never |
| `'event'`  | Fire-and-forget; no response | Never | Never |

Add valibot schemas when the RPC is user-facing, when you want static dumps, or when you expose it to agents. Prefer a **single object arg** (`args: [v.object({ ... })]`) over positional args — property names self-document and agents rely on them.

### `jsonSerializable` (wire + dump format)

`jsonSerializable` declares the on-wire / on-disk shape contract:

| Value | Encoder | Wire prefix | Round-trips |
|-------|---------|-------------|-------------|
| `false` (default) | `structured-clone-es` | `s:` | `Map`, `Set`, `Date`, `BigInt`, cycles, class instances |
| `true` (opt-in) | strict `JSON.stringify` | _(unprefixed)_ | JSON-only |

Set `jsonSerializable: true` when your handler returns plain JSON shapes — the strict serializer **throws `DF0020`** synchronously on the offending call when it sees a value JSON cannot round-trip (Map/Set/Date/BigInt/class instance/`undefined`-in-array). Errors surface in dev next to the call that introduced them, not silently at build time.

`agent: {...}` requires `jsonSerializable: true` (registration throws `DF0019` otherwise). MCP tools speak JSON — opting into the agent surface is also opting into JSON-only data.

`ctx.rpc.broadcast({ method, args, optional?, event?, filter? })` pushes to every connected client. `ctx.rpc.invokeLocal(name, ...args)` calls a server function without going through transport (useful for cross-function composition).

## Shared state

```ts
const state = await ctx.rpc.sharedState.get('my-inspector:state', {
  initialValue: { count: 0, items: [] as string[] },
})

state.mutate((draft) => {
  draft.count += 1
  draft.items.push('tick')
})
```

- Values must be serializable — no functions, no circular refs.
- Mutations round-trip to all clients; the host tracks `syncIds` to avoid replay loops.
- Prefer shared state over ad-hoc RPC events for UI that must reappear after reconnect.

## Streaming channels

For chunk-style data flowing in either direction — LLM deltas, log tails, build progress, file uploads, mic / screen-share frames — use a streaming channel instead of inventing `action + delta/end` events. The same `channel` object handles both directions:

```ts
const channel = ctx.rpc.streaming.create<string>('my-inspector:tokens', {
  replayWindow: 256, // server keeps last N chunks per stream id
  closedStreamRetention: 30_000, // ms to hold finished streams for late subscribers
})
```

### Server-to-client (the common case)

```ts
// Server — typically inside an action handler that returns the stream id
const stream = channel.start({ id?: string })
stream.write(token) // imperative
stream.error(err) // terminal failure
stream.close() // terminal success
stream.signal // AbortSignal — flips when consumers cancel or all subscribers drop
stream.writable // WritableStream<T> for `pipeTo`-style consumption

// Convenience — start + pipe in one call:
await channel.pipeFrom(sourceReadable, { id: 'optional' })

// Client
const reader = rpc.streaming.subscribe<string>('my-inspector:tokens', streamId)
for await (const token of reader) renderToken(token)
// Or: reader.readable.pipeTo(domWritable)
reader.cancel() // server `stream.signal` aborts
```

### Client-to-server uploads

The same channel exposes `openInbound()` for the server side of a client→server upload. Pair it with a normal action that returns the id:

```ts
// Server
ctx.rpc.register(defineRpcFunction({
  name: 'my-inspector:upload-file',
  type: 'action',
  args: [v.object({ name: v.string() })],
  returns: v.object({ uploadId: v.string() }),
  handler: async ({ name }) => {
    const reader = channel.openInbound()
    ;(async () => {
      for await (const chunk of reader) saveChunk(chunk)
    })()
    return { uploadId: reader.id }
  },
}))

// Client
const { uploadId } = await rpc.call('my-inspector:upload-file', { name: 'foo' })
const upload = rpc.streaming.upload<Uint8Array>('my-inspector:files', uploadId)
fileReadable.pipeTo(upload.writable, { signal: upload.signal })
```

Client disconnect surfaces as `UploadDisconnected` to the server's `for await`. Server-side `reader.cancel()` broadcasts `upload-cancel` to the uploading session, flipping `upload.signal`.

### Lifecycle

| Event | Server | Client |
|-------|--------|--------|
| `stream.close()` / `stream.error(err)` | broadcasts `end` to subscribers | `for await` resolves / throws |
| `reader.cancel()` (last subscriber) | `stream.signal` aborts | reader marked cancelled |
| WS disconnects (last subscriber drops) | `stream.signal` aborts | reader auto-resubscribes after re-trust |

Producers should always poll `stream.signal.aborted` and exit cooperatively.

### Web / Node Streams interop

Web Streams are the canonical surface. Node 17+ ships free converters:

```ts
import { Readable, Writable } from 'node:stream'

sourceNodeReadable.pipe(Writable.fromWeb(stream.writable))
Readable.fromWeb(reader.readable).pipe(targetNodeWritable)
```

### When to use streaming vs events vs shared state

| Use streaming for | Use `event`-typed RPC for | Use shared state for |
|-------------------|---------------------------|----------------------|
| Token / chunk feeds, uploads | Notifications without payload (`refresh`) | Long-lived UI state that survives reconnect |
| Per-call lifecycles with cancellation | Cross-cutting fire-and-forget signals | Diff-based sync between clients |
| Replay on reconnect | | |

For chat-style UIs that combine both: keep the **conversation log** in shared state (survives reconnects), and use a streaming channel for **active responses**. The action that starts a response appends a placeholder to shared state; on producer close, commit the joined content back to shared state. Working example: [`devframe/examples/devframe-streaming-chat`](https://github.com/vitejs/devtools/tree/main/devframe/examples/devframe-streaming-chat).

## Dock entries

Five entry types: `iframe` (full panel), `action` (client script on click), `custom-render` (mount into panel DOM), `launcher` (setup card + server callback), `json-render` (UI from a JSON spec, zero client code).

```ts
// Iframe — most common:
ctx.docks.register({
  id: 'my-inspector',
  title: 'My Inspector',
  icon: 'ph:magnifying-glass-duotone',
  type: 'iframe',
  url: '/.my-inspector/',
})

ctx.views.hostStatic('/.my-inspector/', clientDist)
```

All entries accept `when` for conditional visibility and `badge` for short indicator text. See `/devframe/dock-system` for the full type reference.

### Remote docks

Set `remote: true` on an iframe dock to turn a hosted URL into a live DevFrame client. DevFrame injects an auth-approved connection descriptor into the iframe URL; on the hosted page, `connectDevtool()` parses it and returns a fully connected client — no extra wiring. Dev-mode only.

## Commands

```ts
import { defineCommand } from 'devframe'

ctx.commands.register(defineCommand({
  id: 'my-inspector:clear-cache',
  title: 'Clear Cache',
  icon: 'ph:trash-duotone',
  keybindings: [{ key: 'Mod+Shift+C' }],
  when: 'clientType == embedded',
  handler: async () => clearCache(),
}))
```

- Two-level hierarchy (parent + `children`) max.
- Use `Mod` for platform-aware modifier (Cmd on macOS, Ctrl elsewhere).
- `ctx.commands.execute(id, ...args)` runs a command programmatically.
- `when` is a whenexpr expression — see below.

## Logs & notifications

```ts
// Fire-and-forget
ctx.messages.add({ message: 'Scan complete', level: 'success', notify: true })

// With handle for in-place updates
const handle = await ctx.messages.add({
  id: 'my-inspector:build',
  message: 'Building…',
  level: 'info',
  status: 'loading',
})
await handle.update({ message: 'Built', level: 'success', status: 'idle' })
```

`notify: true` also renders a toast. `filePosition: { file, line, column }` makes the entry click-to-editor. `elementPosition: { selector, boundingBox }` highlights a DOM element. Re-adding with the same `id` updates the existing entry (deduplication pattern).

## Terminals

```ts
const session = await ctx.terminals.startChildProcess(
  { command: 'vite', args: ['build', '--watch'], cwd: process.cwd() },
  { id: 'my-inspector:build', title: 'Build', icon: 'ph:terminal-duotone' },
)

await session.terminate()
await session.restart()
```

Color is enabled automatically (`FORCE_COLOR=true`). Output streams into the built-in Terminals panel and is buffered for late-joining clients.

## When clauses

Gate dock / command visibility with VS Code-style expressions (evaluated by the external `whenexpr` package):

```ts
when: 'clientType == embedded'
when: 'dockOpen && !paletteOpen'
when: 'my-inspector.ready && count >= 10'
```

Built-in context: `clientType` (`'embedded' | 'standalone'`), `dockOpen`, `paletteOpen`, `dockSelectedId`. Plugins can add namespaced keys (`.` or `:` separators). Both the types (`WhenExpression<Ctx, S>`) and runtime (`evaluateWhen`, `resolveContextValue`) are re-exported from `devframe/utils/when`.

## Agent-native surface (experimental)

Opt an RPC function into the agent surface with an `agent` field — default-deny otherwise. Agent-exposed functions **must declare `jsonSerializable: true`** (registration throws `DF0019` otherwise):

```ts
defineRpcFunction({
  name: 'my-inspector:get-stats',
  type: 'query',
  jsonSerializable: true,
  args: [v.object({ limit: v.number() })],
  returns: v.object({ count: v.number() }),
  agent: {
    description: 'Return the top-N module stats. Safe to call freely.',
    // safety inferred from type: 'query' → 'read'
  },
  setup: () => ({ handler: async ({ limit }) => ({ count: limit }) }),
})
```

Or register tools / resources directly:

```ts
ctx.agent.registerTool({
  id: 'my-inspector:summarize',
  description: 'Plain-text summary of the current scan.',
  safety: 'read',
  handler: async () => ({ markdown: buildSummary() }),
})

ctx.agent.registerResource({
  id: 'current-scan',
  name: 'Current scan',
  mimeType: 'text/markdown',
  read: () => ({ text: renderMarkdown(currentScan) }),
})
```

Expose via MCP:

```ts
import { createMcpServer } from 'devframe/adapters/mcp'

await createMcpServer(devtool, { transport: 'stdio' })
```

`@modelcontextprotocol/sdk` is a peer dependency. The CLI adapter also exposes `my-devtool mcp` — route host logs to stderr (stdout is the MCP transport). Safety classifications (`'read' | 'action' | 'destructive'`) drive MCP hint annotations that agent clients use to prompt for confirmation.

## Author SPA

Authors bring their own SPA (any framework or plain HTML). Client entry:

```ts
import { connectDevtool } from 'devframe/client'

const rpc = await connectDevtool()
// await rpc.ensureTrusted() // WS mode only — blocks until server accepts

const data = await rpc.call('my-inspector:get-stats', { limit: 10 })
```

`connectDevtool` auto-detects the backend via `/.devtools/.connection.json`:

- **websocket** (dev mode) — full read/write, requires auth handshake. Listen for token updates on the `vite-devtools-auth` BroadcastChannel.
- **static** (build / spa output) — read-only, resolves calls from the baked RPC dump.

Use `rpc.sharedState.get(key)` for observable state, `rpc.client.register(defineRpcFunction(...))` to receive server broadcasts, and `rpc.callOptional(...)` when a missing handler should resolve to `undefined` instead of throwing.

## Build dumps

`createBuild` bakes `static` function results automatically. For `query` functions, supply `dump` (or `snapshot: true` for the no-args sugar):

```ts
defineRpcFunction({
  name: 'my-inspector:get-session',
  type: 'query',
  setup: () => ({
    handler: async (id: string) => loadSession(id),
    dump: {
      inputs: [['session-a'], ['session-b']],
      fallback: { id: 'unknown', data: null },
    },
  }),
})
```

At runtime, static clients look up the argument hash in the dump; misses resolve to `fallback` (or throw if absent).

## CLI adapter subcommands

`createCli(devtool).parse()` gives the tool four subcommands out of the box:

| Subcommand | Action |
|------------|--------|
| *(default)* | Dev server on port 9999 (or `--port`) — WebSocket RPC, `cli.distDir` served at `/.devtools/` |
| `build` | Static snapshot → `./dist-static/` (configurable via `--out-dir`) |
| `spa` | Deployable SPA → `./dist-spa/` |
| `mcp` | stdio MCP server (experimental) |

**Bring your own CLI framework?** `createCli` is just a cac wrapper around three peer factories — `createDevServer` (`devframe/adapters/dev`), `createBuild` (`devframe/adapters/build`), and `createMcpServer` (`devframe/adapters/mcp`). Use them directly with commander/yargs/oclif when `createCli`'s baked-in command structure doesn't fit. `createDevServer` returns a `StartedServer` handle (`origin`, `port`, `app`, `wss`, `close()`) so you can wire SIGINT / hot-reload teardown into the surrounding program. `parseCliFlags(schema, raw)` and `defineCliFlags(...)` (both from `devframe/adapters/cli`) validate an arbitrary flag bag against a `CliFlagsSchema` — typed flags aren't tied to cac.

## Testing

- Unit-test host classes with fake contexts.
- Run `templates/counter-devtool.ts` under each adapter for integration coverage.
- Snapshot the build-static RPC dump (`<outDir>/.devtools/.rpc-dump/index.json`) to catch accidental drift in `static` function outputs.

## Further reading

All of the above has a dedicated page at [docs.devtools.vite.dev/devframe](https://devtools.vite.dev/devframe/):

- [Devtool Definition](https://devtools.vite.dev/devframe/devtool-definition) — fields, runtime flags, multi-adapter wiring
- [Adapters](https://devtools.vite.dev/devframe/adapters) — full reference for all seven adapters
- [RPC](https://devtools.vite.dev/devframe/rpc) — types, schema, broadcasts, dumps
- [Shared State](https://devtools.vite.dev/devframe/shared-state) — patches, events, client-side mutation
- [Streaming](https://devtools.vite.dev/devframe/streaming) — chunked feeds, uploads, replay, Web/Node Streams interop
- [Dock System](https://devtools.vite.dev/devframe/dock-system) — every entry type + remote docks
- [Commands](https://devtools.vite.dev/devframe/commands) — palette, keybindings, sub-commands
- [When Clauses](https://devtools.vite.dev/devframe/when-clauses) — syntax, context, type-safe wrappers
- [Messages & Notifications](https://devtools.vite.dev/devframe/messages) — entry fields, positional hints
- [Structured Diagnostics](https://devtools.vite.dev/devframe/diagnostics) — coded errors via `ctx.diagnostics`, register custom codes
- [Terminals](https://devtools.vite.dev/devframe/terminals) — child processes, external sessions
- [Client](https://devtools.vite.dev/devframe/client) — auth handshake, modes, discovery
- [Agent-Native](https://devtools.vite.dev/devframe/agent-native) — agent field, tools/resources, MCP + Claude Desktop
