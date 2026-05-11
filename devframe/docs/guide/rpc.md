---
outline: deep
---

# RPC

Devframe's RPC layer is type-safe bidirectional communication between your server (Node.js) and client (browser), built on [`birpc`](https://github.com/antfu/birpc) and validated at runtime with [`valibot`](https://valibot.dev/). In dev mode it runs over WebSocket; in build / SPA mode it serves a pre-computed static dump so the client still works offline.

## Overview

```mermaid
sequenceDiagram
  participant Client as Browser client
  participant Server as Node server

  Client->>Server: rpc.call('my-devframe:get-modules')
  Note over Server: handler: async () =><br/>readModules()
  Server-->>Client: [{ id, size }, …]
```

## Defining a function

```ts
import { defineRpcFunction } from 'devframe'
import * as v from 'valibot'

export const getModules = defineRpcFunction({
  name: 'my-devframe:get-modules',
  type: 'query',
  args: [v.object({ limit: v.number() })],
  returns: v.array(v.object({ id: v.string(), size: v.number() })),
  setup: ctx => ({
    handler: async ({ limit }) => {
      // `ctx` is the DevToolsNodeContext.
      return loadModules().slice(0, limit)
    },
  }),
})
```

Register it in `setup`:

```ts
import { defineDevframe } from 'devframe'
import { getModules } from './rpc/get-modules'

export default defineDevframe({
  id: 'my-devframe',
  name: 'My Devframe',
  setup(ctx) {
    ctx.rpc.register(getModules)
  },
})
```

### Naming convention

Scope with your devframe id and use kebab-case for the action: `my-devframe:get-modules`, `my-devframe:read-file`, `my-devframe:trigger-rebuild`.

### Function types

| Type | Description | Cached | Static Dump |
|------|-------------|--------|-------------|
| `query` | Read operation that can change over time. | Opt-in via `cacheable` | Manual (declare `dump`) |
| `static` | Data that never changes for a given input. | Indefinitely | Automatic |
| `action` | Mutation with side effects. | Never | Never |
| `event` | Fire-and-forget; no response. | Never | Never |

Use `static` for data collected once during `setup` and shipped to read-only static / SPA clients.

### Handler arguments

Handlers accept any serializable arguments. With `args` valibot schemas, arguments are validated at the boundary:

```ts
defineRpcFunction({
  name: 'my-devframe:get-file',
  type: 'query',
  args: [v.object({ path: v.string(), includeSource: v.optional(v.boolean()) })],
  returns: v.object({ path: v.string(), source: v.optional(v.string()) }),
  setup: () => ({
    handler: async ({ path, includeSource }) => ({
      path,
      source: includeSource ? await readFile(path, 'utf-8') : undefined,
    }),
  }),
})
```

Prefer a single object argument (`args: [v.object({ ... })]`) over positional args — property names are self-describing and agents/IDEs work best with object shapes.

### Setup vs handler

Two ways to wire a handler:

- **`setup(ctx)`** — receives the `DevToolsNodeContext` and returns `{ handler, dump? }`. Use this when you need the context (shared state, logs, `ctx.mode`, etc.).
- **`handler(...)`** — shorthand when the handler is pure and doesn't touch the context.

```ts
// With setup:
defineRpcFunction({
  name: 'my-devframe:count',
  type: 'query',
  setup: ctx => ({
    handler: async () => ctx.rpc.sharedState.keys().length,
  }),
})

// Shorthand:
defineRpcFunction({
  name: 'my-devframe:echo',
  type: 'query',
  handler: (msg: string) => msg,
})
```

## Broadcasting

`ctx.rpc.broadcast` sends a message from the server to every connected client:

```ts
defineDevframe({
  id: 'my-devframe',
  name: 'My Devframe',
  setup(ctx) {
    watcher.on('change', (file) => {
      void ctx.rpc.broadcast({
        method: 'my-devframe:on-file-changed',
        args: [{ file }],
      })
    })
  },
})
```

| Option | Type | Description |
|--------|------|-------------|
| `method` | client RPC name | Function registered on the client side. |
| `args` | any[] | Arguments passed to the client function. |
| `optional` | `boolean` | Don't throw if no client is listening. |
| `event` | `boolean` | Fire-and-forget (don't wait for responses). |
| `filter` | `(client) => boolean` | Skip specific clients. |

## Streaming

For chunk-style server→client feeds (chat deltas, log lines, build progress), use [streaming channels](./streaming) — they handle stream IDs, cancellation, replay, and Web Streams interop for you:

```ts
const channel = ctx.rpc.streaming.create<string>('my-devframe:chat', {
  replayWindow: 256,
})
const stream = channel.start()
sourceReadable.pipeTo(stream.writable)
```

See the [Streaming guide](./streaming) for the full API.

## Local invocation

`ctx.rpc.invokeLocal` calls a registered server function directly, skipping the transport — useful for cross-function composition on the server side:

```ts
const modules = await ctx.rpc.invokeLocal('my-devframe:get-modules', { limit: 10 })
```

## Client-side calls

From the browser, [`connectDevframe`](./client) (or `getDevToolsRpcClient`) returns a client for calling registered functions:

```ts
import { connectDevframe } from 'devframe/client'

const rpc = await connectDevframe()

const modules = await rpc.call('my-devframe:get-modules', { limit: 10 })
```

Client-side registration (for server→client calls) goes through `rpc.client.register()` — the mirror API of `ctx.rpc.register()`.

## Static dumps

For `static` functions, Devframe records the handler's output during `createBuild` and bakes it into the build:

```ts
defineRpcFunction({
  name: 'my-devframe:build-meta',
  type: 'static',
  args: [],
  returns: v.object({ version: v.string(), builtAt: v.number() }),
  setup: () => ({
    handler: async () => ({ version: '1.0.0', builtAt: Date.now() }),
  }),
})
```

For `query` functions, provide an explicit `dump` to enumerate which argument sets to pre-compute:

```ts
defineRpcFunction({
  name: 'my-devframe:get-session',
  type: 'query',
  setup: ctx => ({
    handler: async (id: string) => loadSession(id),
    dump: {
      inputs: [['session-a'], ['session-b']],
      fallback: { id: 'unknown', data: null },
    },
  }),
})
```

At runtime, static clients resolve `rpc.call('my-devframe:get-session', 'session-a')` from the baked dump; unmatched arguments resolve to `dump.fallback` (or throw without one).

## JSON-serializable declaration

Devframe's WS transport ships payloads using one of two encoders, picked per RPC function:

| `jsonSerializable` | Encoder | Wire prefix | Round-trips |
|---|---|---|---|
| `false` (default) | `structured-clone-es` | `s:` | `Map`, `Set`, `Date`, `BigInt`, cycles, class instances |
| `true` (opt-in) | strict `JSON.stringify` | _(unprefixed)_ | JSON-only |

The wire stays plain JSON when every participating function is JSON-flagged — debuggable in DevTools, friendly to MCP, and a good default for tools that already speak JSON.

### Discovering shape errors during dev

`jsonSerializable: true` is a contract. When a handler returns a value JSON cannot round-trip (a `Map`, a `Date`, a class instance, …), the strict serializer throws [`DF0020`](../errors/DF0020) synchronously on the offending call — surfacing the bad value next to the call site in dev:

```ts
defineRpcFunction({
  name: 'my-devframe:graph',
  jsonSerializable: true,
  // ⚠ throws DF0020 because Map cannot round-trip through JSON
  handler: () => ({ nodes: new Map([['a', 1]]) }),
})
```

For richer types, leave the flag unset (or `false`) — `structured-clone-es` preserves them on the wire and in build dumps. The flag is opt-in, so existing code keeps working untouched.

### MCP requires JSON

MCP tools expose their schemas as JSON Schema, and agent harnesses assume JSON-shaped data. `agent: {...}` therefore requires `jsonSerializable: true`; registering one without the other throws [`DF0019`](../errors/DF0019). See the next section for how to attach the `agent` field once your function is JSON-safe.

## Agent exposure

Add an `agent` field to surface the function to coding agents over MCP. Agent exposure is opt-in; functions without an `agent` field stay private. Agent-exposed functions must also declare `jsonSerializable: true` (see above).

```ts
defineRpcFunction({
  name: 'my-devframe:get-modules',
  type: 'query',
  jsonSerializable: true,
  args: [v.object({ limit: v.number() })],
  returns: v.array(v.object({ id: v.string(), size: v.number() })),
  agent: {
    description: 'List the N largest modules in the current build. Safe to call freely.',
    title: 'List modules',
    // safety inferred from type: 'query' → 'read'
  },
  setup: () => ({
    handler: async ({ limit }) => loadModules().slice(0, limit),
  }),
})
```

See [Agent-Native](./agent-native) for the full safety model and MCP integration.

## What's next

- [Shared State](./shared-state) — observable state synced across clients
- [Client](./client) — connecting from the browser
- [Agent-Native](./agent-native) — exposing RPCs to agents
