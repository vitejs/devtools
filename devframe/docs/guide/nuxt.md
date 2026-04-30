---
outline: deep
---

# Nuxt Helper

The `devframe/helpers/nuxt` module wires a Nuxt-built SPA up as a devframe client. It's an integration helper, not a deployment adapter — it runs inside the Nuxt app that consumes your devtool, not as part of the CLI that serves it.

It handles the three things every Nuxt-powered standalone devtool needs to get right:

1. **Base-agnostic assets.** Forces `app.baseURL: './'` and `vite.base: './'` so the same production build works at `/`, at `/tool/`, and on any other deployment path without build-time URL rewriting.
2. **Runtime RPC connection.** Adds a client plugin that calls [`connectDevtool()`](./client) once on page load and provides the result as `$rpc` on the Nuxt app.
3. **TypeScript augmentation.** `useNuxtApp().$rpc` is typed as `DevToolsRpcClient` out of the box.

## Install

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  modules: ['devframe/helpers/nuxt'],
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
  modules: ['devframe/helpers/nuxt'],
  devframe: {
    baseURL: './', // where the devframe snapshot lives, relative to the page
    skipAppDefaults: false, // opt out of the app.baseURL / vite.base defaults
  },
})
```

- **`baseURL`** defaults to `'./'`, which resolves against `document.baseURI` at runtime. The connection meta and dump shards sit next to `index.html`, so the same build works at any deployment path — no need to pass `--base` at build time.
- **`skipAppDefaults: true`** disables the `app.baseURL: './'` / `vite.base: './'` defaults. Use this only if you're deliberately shipping with absolute asset paths and have your own base-URL story.

## How it works

At build time the module:

- Sets `nuxt.options.app.baseURL` to `'./'` (unless already set)
- Sets `nuxt.options.vite.base` to `'./'` (unless already set)
- Merges `{ devframe: { baseURL } }` into `runtimeConfig.public`
- Injects a client-only plugin (`helpers/nuxt/runtime/plugin.client`) that:
  ```ts
  const rpc = await connectDevtool({ baseURL: config.public.devframe.baseURL })
  return { provide: { rpc } }
  ```

At runtime the built SPA fetches `./.connection.json` (resolved against `document.baseURI`) and branches on the `backend` field — `websocket` in dev, `static` from a `createBuild` snapshot.

## Relationship to `createCli`

The Nuxt helper is a client-side integration; it does **not** start a server. The typical shape is:

```
my-tool/
├── bin.mjs               # createCli(devtool).parse()
├── src/
│   ├── cli.ts            # defineDevtool + setup(ctx) { ctx.rpc.register(...) }
│   └── app/              # Nuxt SPA — uses `devframe/helpers/nuxt`
└── dist/
    ├── cli.mjs           # bundled Node entry
    └── public/           # Nuxt build output, pointed at by cli.distDir
```

- `createCli` (from `devframe/adapters/cli`) runs the Node side — HTTP + WS + static build + MCP.
- `devframe/helpers/nuxt` handles the client side — RPC connection + base-URL plumbing.

They're decoupled: swap Nuxt for any other SPA framework as long as it calls `connectDevtool()` in the browser.

## See also

- [Standalone CLI recipe](./standalone-cli) — end-to-end walk-through
- [Client](./client) — `connectDevtool` reference
- [Adapters](./adapters) — CLI / Vite / Build / SPA / Kit / Embedded / MCP
