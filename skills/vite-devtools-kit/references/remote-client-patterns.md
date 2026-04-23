# Remote Client Patterns

Remote client mode lets an iframe dock point at a **hosted website** instead of bundling a SPA dist with your plugin. The hosted page opens a WebSocket to the local dev server and uses the same RPC and shared-state APIs as an embedded client.

## When to use remote mode

- You don't want to ship a client dist with your plugin (node-side only npm package).
- You deploy the UI independently from the plugin release cycle.
- You already host a dashboard and want to surface it directly inside DevTools.

Tradeoff: users must be online to load the hosted page, and you trust the hosted origin to faithfully render local data.

## Node-side registration

```ts
import type { Plugin } from 'vite'

export function myPlugin(): Plugin {
  return {
    name: 'my-plugin',
    devtools: {
      setup(ctx) {
        ctx.docks.register({
          id: 'my-remote-tool',
          title: 'My Tool',
          icon: 'ph:cloud-duotone',
          type: 'iframe',
          url: 'https://example.com/devtools',
          remote: true,
        })
      },
    },
  }
}
```

That's the entire node-side change — DevTools allocates a session-only token, injects a connection descriptor into the iframe URL, and accepts the token on WS handshake (with origin verification).

## `RemoteDockOptions`

```ts
interface RemoteDockOptions {
  transport?: 'fragment' | 'query' // default: 'fragment'
  originLock?: boolean // default: true
}

// Shorthand
remote: true
// Explicit
remote: { transport: 'query', originLock: false }
```

### `transport`

| Value | Descriptor location | Visibility |
|-------|--------------------|------------|
| `'fragment'` (default) | `#vite-devtools-kit-connection=...` | Not sent to servers, not in access logs, stripped from Referer |
| `'query'` | `?vite-devtools-kit-connection=...` | Appears in server logs and outbound Referer |

Prefer `'fragment'`. Opt into `'query'` only when:
- Your SPA router uses the fragment for navigation.
- Your CDN/host rewrites URLs in a way that drops fragments.

### `originLock`

When on (default), the WS handshake is rejected if the browser's `Origin` header doesn't match the origin of the dock URL. Turn off only when the same hosted app is served from multiple origins (e.g. preview deploys on `pr-123.preview.example.com`).

## Hosted-page implementation

Install `@vitejs/devtools-kit` as a dependency of the hosted page (the client entrypoint is browser-safe):

```sh
pnpm add @vitejs/devtools-kit
```

```ts
import { connectRemoteDevTools } from '@vitejs/devtools-kit/client'

const rpc = await connectRemoteDevTools()

// Use it like any DevToolsRpcClient:
const data = await rpc.call('my-plugin:get-data')
```

`connectRemoteDevTools()` reads the descriptor from the current URL, opens the WebSocket, and resolves to a `DevToolsRpcClient` with `.call`, `.callEvent`, `.callOptional`, `.sharedState`, etc.

### Standalone-safe pages

The call throws when the descriptor is missing — e.g. someone opens the hosted URL directly. Use `parseRemoteConnection()` to branch before connecting:

```ts
import { connectRemoteDevTools, parseRemoteConnection } from '@vitejs/devtools-kit/client'

if (!parseRemoteConnection()) {
  renderStandaloneLandingPage()
}
else {
  const rpc = await connectRemoteDevTools()
  renderConnectedUi(rpc)
}
```

### Custom client options

`connectRemoteDevTools` forwards any `DevToolsRpcClientOptions` except `connectionMeta` and `authToken` (those come from the descriptor):

```ts
const rpc = await connectRemoteDevTools({
  cacheOptions: { maxAge: 5000 },
})
```

For tests or non-browser environments, pass an explicit URL or raw fragment/query string to `parseRemoteConnection`:

```ts
parseRemoteConnection('https://example.com/p#vite-devtools-kit-connection=...')
parseRemoteConnection('?vite-devtools-kit-connection=...')
```

## Descriptor shape

```ts
interface RemoteConnectionInfo {
  v: 1
  backend: 'websocket'
  /** Full ws:// or wss:// URL */
  websocket: string
  authToken: string
  /** Dev-server origin, e.g. http://localhost:5173 */
  origin: string
}
```

JSON-encoded then base64url-encoded, appended to the iframe URL under the key `vite-devtools-kit-connection`.

## Trust model

- **Pre-approved session token** — no interactive "trust this browser?" prompt. The user agreed to the integration when they installed your plugin.
- **Session-scoped** — in-memory only, regenerated on every dev-server restart.
- **Re-register revokes** — registering the same id again revokes the previous token; live clients using the old token receive `devtoolskit:internal:auth:revoked` and become untrusted.
- **Origin-locked by default** — only connections whose `Origin` matches the dock URL origin are accepted.

Treat the token as a session secret: don't log URLs to external analytics on the hosted page, and prefer `transport: 'fragment'` unless you have a specific reason not to.

## Build mode

The WebSocket server exists only in dev mode. When `remote` is set, DevTools automatically hides the dock in build mode by defaulting `when` to `'mode != build'`. Override with your own `when` if needed:

```ts
ctx.docks.register({
  // ...
  remote: true,
  when: 'clientType == embedded', // overrides the default
})
```
