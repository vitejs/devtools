---
outline: deep
---

# Client Script & Context

In embedded mode, Vite DevTools injects a small **client script** into your app's page. It boots the dock and publishes the **client context** — the object every client-side surface (dock action scripts, custom renderers, your own app code) uses to talk to DevTools.

## The client script

The client script (`@vitejs/devtools/client/inject`) connects an RPC client to the DevTools server at `/__devtools/`, builds the client context on top of it, and mounts the embedded dock. The `DevTools()` plugin injects it automatically:

- **During `vite dev`** via `transformIndexHtml`. A production build ships the same bootstrap through [`build.withApp`](/guide/#building-with-the-app).
- **In client environments only** — SSR builds and server code stay untouched.
- **In top-level windows only** — inside an iframe the script exits, so a page never mounts a second dock.

Which entry is injected follows the resolved `embeddedVisibility`: `inject` (shown immediately), `inject-passive` (hidden until <kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>D</kbd>, then remembered), or `inject-hidden` (revealed per session). For projects without an HTML entry, import one of these entries yourself — see [Getting Started](/guide/#projects-without-an-html-entry).

## The client context

`DevToolsClientContext` is the client-side counterpart of the [node context](./devtools-plugin). Read it anywhere in the host page with `getDevToolsClientContext()`, which returns `undefined` until the script finishes initializing:

```ts
import { getDevToolsClientContext } from '@vitejs/devtools-kit/client'

const ctx = getDevToolsClientContext()
if (ctx) {
  const data = await ctx.rpc.call('my-plugin:get-modules')
}
```

| Property | Description |
|----------|-------------|
| `rpc` | The [RPC](./rpc) client — call server functions, register client functions, reach shared state |
| `clientType` | `'embedded'` (dock inside your app) or `'standalone'` (independent DevTools page) |
| `docks` | Dock entries and selection — `entries`, `selected`, `switchEntry()` |
| `panel` | Dock panel state: position, size, drag/resize flags |
| `commands` | The [command palette](./commands): `register()`, `execute()`, keybindings |

The browser RPC client and connection modes are documented in the [Devframe client guide](https://devfra.me/guide/client).
