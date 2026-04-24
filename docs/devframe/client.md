---
outline: deep
---

# Client

The browser-side client is how a dock iframe, remote-hosted page, or standalone SPA talks to the DevFrame server. It provides type-safe RPC calls, access to shared state, and (in dev mode) a trust handshake against the local dev server.

## Connecting

`devframe/client` exports `connectDevtool` (an alias of `getDevToolsRpcClient`) — use either name:

```ts
import { connectDevtool } from 'devframe/client'

const rpc = await connectDevtool()

const modules = await rpc.call('my-devtool:get-modules', { limit: 10 })
```

`connectDevtool` auto-detects the backend via `.devtools/.connection.json` and falls back through a sequence of base URLs. No arguments are needed when the client is hosted from the default mount path.

### Runtime basePath discovery

SPAs built for devframe are designed to be **base-agnostic**: the same artifact can be served at `/`, at `/.<id>/`, or at any custom subpath, without rebuilding. `connectDevtool` resolves `.connection.json` relative to the page at runtime by reading `document.baseURI` and the executing script's URL.

The practical consequence for SPA authors:

- Build with relative asset paths — in Vite use `base: './'`, in Nuxt set `vite.base: './'` and `app.baseURL: './'`.
- Don't bake the mount path into the HTML. The server only needs to serve the files at *some* base; the client figures out which.
- You don't need an explicit `baseURL` option on `connectDevtool` unless you're connecting across origins or to a non-colocated devtool server.

This lets `createBuild` / `createSpa` copy SPA output verbatim — no build-time HTML rewriting is performed, and the resulting bundle deploys under any URL.

### Options

```ts
await connectDevtool({
  baseURL: '/.devtools/', // string or string[] fallback list
  authToken: 'user-provided-token',
  cacheOptions: true, // enable response caching
  wsOptions: { /* … */ },
  rpcOptions: { /* birpc options */ },
})
```

| Option | Description |
|--------|-------------|
| `baseURL` | Mount path to probe for `.connection.json`. Accepts an array for fallback. Default: resolved relative to the executing page / script — see [Runtime basePath discovery](#runtime-basepath-discovery). |
| `authToken` | Override the auth token. Defaults to a locally-persisted human-readable id. |
| `cacheOptions` | `true` to enable caching with defaults, or an options object. |
| `wsOptions` | Forwarded to the WebSocket transport (reconnect, heartbeat, etc.). |
| `rpcOptions` | Forwarded to `birpc`. |
| `connectionMeta` | Skip the `.connection.json` fetch with a pre-known descriptor. |

## Modes

The client runs in one of two modes depending on what the server advertises in `.devtools/.connection.json`:

| Backend | When | Capabilities |
|---------|------|--------------|
| `websocket` | Dev mode (`createCli`, Kit) | Full read/write, broadcasts, shared-state mutation. Requires auth. |
| `static` | Build / SPA output | Read-only — all calls resolve against the baked RPC dump. |

You don't pick a mode — the client reads the backend field and chooses automatically. Code paths that only make sense in one mode (e.g. `broadcast`) throw in the other.

## Trust & Auth (WebSocket mode)

Dev-mode connections must be trusted before the server accepts calls. The client handles this automatically: on first connect it submits the locally-stored auth token, and resolves `ensureTrusted()` once the server accepts.

```ts
const rpc = await connectDevtool()

// Blocks until the server trusts this client (default timeout 60s)
const trusted = await rpc.ensureTrusted()

if (!trusted) {
  console.warn('Auth denied')
}
```

### Replacing the token

If the user provides a token from a different source (e.g. a copy-paste from the CLI output), swap it in without reloading:

```ts
const ok = await rpc.requestTrustWithToken('another-token')
```

### Broadcast-channel sync

`connectDevtool` listens on a `BroadcastChannel('vite-devtools-auth')` for `auth-update` messages. When an auth page in another tab announces a new token, every open client requests trust with it automatically — no reload required.

## Calling Functions

```ts
const rpc = await connectDevtool()

// Standard call — awaits a response or throws.
const modules = await rpc.call('my-devtool:get-modules', { limit: 10 })

// Optional — returns undefined if no handler responds (useful while HMR is restarting).
const maybe = await rpc.callOptional('my-devtool:get-modules', { limit: 10 })

// Event — fire-and-forget, no response expected.
rpc.callEvent('my-devtool:notify', { message: 'hello' })
```

TypeScript types flow through from the server's `defineRpcFunction` definitions, so argument and return shapes are known at the call site.

## Registering Client Functions

The client can register its own functions that the server calls via `ctx.rpc.broadcast`:

```ts
import { defineRpcFunction } from 'devframe'

rpc.client.register(defineRpcFunction({
  name: 'my-devtool:on-file-changed',
  type: 'event',
  setup: () => ({
    handler: async ({ file }: { file: string }) => {
      console.log('server says:', file, 'changed')
    },
  }),
}))
```

This is how the server pushes live updates into the UI — file watcher events, shared-state sync, etc.

## Shared State

```ts
const state = await rpc.sharedState.get('my-devtool:state')

console.log(state.value())

state.mutate((draft) => {
  draft.count += 1
})

state.on('updated', (next) => {
  console.log('new state', next)
})
```

Client-side mutations round-trip through the server before reappearing locally. See [Shared State](./shared-state) for the full API.

## Caching

Set `cacheOptions: true` (or an options object) when constructing the client:

```ts
const rpc = await connectDevtool({ cacheOptions: true })
```

With caching on, `query` / `static` function responses are memoized per argument hash. Server-side broadcasts like `rpc:cache:invalidate` clear entries automatically — plugins that mutate state should broadcast that message after the change.

## Discovery (`.connection.json`)

DevFrame writes a small JSON descriptor at `<base>/.connection.json` so the client knows where to connect:

```json
{
  "backend": "websocket",
  "websocket": "ws://localhost:9999/__ws"
}
```

or for static mode:

```json
{ "backend": "static" }
```

You almost never need to read this yourself — the client handles it. If you do need to override discovery, pass `connectionMeta` directly:

```ts
await connectDevtool({
  connectionMeta: { backend: 'static' },
})
```

## Remote Docks

Remote docks (see [Dock System → Remote Docks](./dock-system#remote-docks)) work by DevFrame injecting a connection descriptor into the iframe URL. On the hosted page, `connectDevtool` auto-detects the descriptor from the URL fragment / query string — no code change required beyond calling it as usual:

```ts
import { connectDevtool } from 'devframe/client'

const rpc = await connectDevtool()
// Already wired to the local dev server via the injected descriptor.
```

The descriptor carries a session-only, pre-approved auth token, so `ensureTrusted()` resolves immediately.

## Events

```ts
rpc.events.on('rpc:is-trusted:updated', (isTrusted) => {
  if (isTrusted)
    console.log('server trusts this client')
  else
    console.log('trust revoked or denied')
})
```

Use `rpc.isTrusted` at any time for a synchronous read, and subscribe to `rpc:is-trusted:updated` to drive reauth flows or gate rendering until the client is trusted.
