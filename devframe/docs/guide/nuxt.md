---
outline: deep
---

# Nuxt Helper

The `@devframes/nuxt` module wires a Nuxt-built SPA as a devframe client, and optionally serves the dev-time RPC bridge alongside `nuxt dev`. It runs inside the Nuxt app that consumes your devframe.

It handles the four things every Nuxt-powered standalone devtool needs:

1. **Base-agnostic assets.** Sets `app.baseURL: './'` and `vite.base: './'` so the same production build works at `/`, `/tool/`, and any other deployment path without build-time URL rewriting.
2. **Runtime RPC connection.** Adds a client plugin that calls [`connectDevframe()`](./client) once on page load and provides the result as `$rpc` on the Nuxt app.
3. **Dev-time RPC bridge.** When you pass `devframe`, `nuxt dev` spins up a separate WebSocket RPC server and serves `__connection.json` so the SPA can reach it — no hand-rolled Vite plugin required.
4. **TypeScript augmentation.** `useNuxtApp().$rpc` is typed as `DevToolsRpcClient` out of the box.

## Install

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  modules: ['@devframes/nuxt'],
})
```

That's it for the zero-config path. The module sets sane defaults for `app.baseURL` and `vite.base`, registers the client plugin, and exposes `devframe/baseURL` on `useRuntimeConfig().public`.

## Using `$rpc`

```vue [app.vue]
<script setup>
const { $rpc } = useNuxtApp()
const payload = await $rpc.call('my-tool:get-payload')
</script>
```

Or from a composable:

```ts [composables/usePayload.ts]
export function usePayload() {
  const { $rpc } = useNuxtApp()
  return useAsyncData('payload', () => $rpc.call('my-tool:get-payload'))
}
```

## Options

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  modules: ['@devframes/nuxt'],
  devframe: {
    baseURL: './', // where the devframe snapshot lives, relative to the page
    skipAppDefaults: false, // opt out of the app.baseURL / vite.base defaults
  },
})
```

- **`baseURL`** defaults to `'./'`, which resolves against `document.baseURI` at runtime. The connection meta and dump shards sit next to `index.html`, so the same build works at any deployment path.
- **`skipAppDefaults: true`** disables the `app.baseURL: './'` / `vite.base: './'` defaults. Use this when you're shipping with absolute asset paths and have your own base-URL story.

## Dev-time RPC bridge

Pass your devframe definition to wire `nuxt dev` up to the RPC backend:

```ts [nuxt.config.ts]
import devframe from './src/devframe' // defineDevframe(...) export

export default defineNuxtConfig({
  modules: [['@devframes/nuxt', { devframe }]],
})
```

That's the full setup. Behind the scenes, `nuxt dev` now:

- Starts a separate WebSocket RPC server on a port resolved via [`get-port-please`](https://github.com/unjs/get-port-please) (respects `devframe.cli.port` / `portRange` / `random`).
- Registers Vite middleware at `${baseURL}__connection.json` so the SPA reads it on load.
- Runs `devframe.setup(ctx, { flags })` once the bridge is up, registering your RPC functions.
- Cleans up the bridge on Vite restart, `nuxt dev` shutdown, and bundle close.

The bridge is **on by default** whenever `devframe` is set. Skip it (back to client-only) with `devMiddleware: false`.

### Customizing the bridge

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  modules: [['@devframes/nuxt', {
    devframe,
    devMiddleware: {
      port: 7777,
      host: '0.0.0.0',
      flags: { config: process.env.MY_CONFIG },
    },
  }]],
})
```

- **`port`** pins the bridge port. Skip it to let `get-port-please` pick a free port.
- **`host`** controls the bridge bind host. Defaults to `nuxt.options.devServer.host ?? devframe.cli?.host ?? 'localhost'`, so `nuxt dev --host` propagates automatically. Set this manually when your Nuxt server config doesn't surface `host` (e.g. custom listen options).
- **`flags`** is forwarded to `devframe.setup(ctx, { flags })`. Use it to pass env-derived configuration into the RPC layer.

### Relationship to `createCli`

The bridge handles the **dev workflow**. Production deploys still go through `createCli` (or `createBuild`), which produces a static `__connection.json` + `__rpc-dump/` snapshot from `cli.distDir`:

```
my-tool/
├── bin.mjs               # createCli(devframe).parse()
├── src/
│   ├── devframe.ts       # defineDevframe + setup(ctx) { ctx.rpc.register(...) }
│   └── app/              # Nuxt SPA — uses `@devframes/nuxt`
└── dist/
    ├── cli.mjs           # bundled Node entry
    └── public/           # Nuxt build output, pointed at by cli.distDir
```

In dev (`nuxt dev`) the bridge is live. In production (`<your-cli> build` then `<your-cli> spa`) the SPA loads the static dump.

## How it works

At build time the module:

- Sets `nuxt.options.app.baseURL` to `'./'` (unless already set)
- Sets `nuxt.options.vite.base` to `'./'` (unless already set)
- Merges `{ devframe: { baseURL } }` into `runtimeConfig.public`
- Injects a client-only plugin (`helpers/nuxt/runtime/plugin.client`) that:
  ```ts
  const rpc = await connectDevframe({ baseURL: config.public.devframe.baseURL })
  return { provide: { rpc } }
  ```

At runtime the built SPA fetches `./__connection.json` (resolved against `document.baseURI`) and branches on the `backend` field — `websocket` in dev, `static` from a `createBuild` snapshot.

## See also

- [Standalone CLI recipe](./standalone-cli) — end-to-end walk-through
- [Client](./client) — `connectDevframe` reference
- [Adapters](./adapters) — CLI / Vite / Build / SPA / Kit / Embedded / MCP
