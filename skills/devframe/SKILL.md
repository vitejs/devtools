---
name: devframe
description: Use when building devtools with devframe — scaffolds DevtoolDefinition, picks the right adapter (CLI / build / SPA / vite / kit / embedded), designs RPC contracts, and wires the author's SPA client. Also use when migrating an existing inspector (eslint-config-inspector, unocss-inspector, node-modules-inspector-style tools) to devframe.
---

# devframe skill

A devtool built on devframe is a **single `DevtoolDefinition`** plus an author-provided SPA. Use one of six adapters to ship it.

## When to use devframe

| Author goal                          | Adapter               | Entry           |
|--------------------------------------|-----------------------|-----------------|
| Standalone CLI for local use         | `createCli`           | `devframe/cli`   |
| Snapshot for hand-off                | `buildStatic`         | `devframe/build` |
| Deployable hosted app                | `buildSpa`            | `devframe/spa`   |
| Plain Vite plugin (no Kit)           | `devframeVite`         | `devframe/vite`  |
| Embed into Vite DevTools Kit         | `toKitPlugin`         | `devframe/kit`   |
| Register into a running context      | `registerInHost`      | `devframe/embedded` |

## Minimum viable devtool

```ts
import { defineDevtool, defineRpcFunction } from 'devframe'

export default defineDevtool({
  id: 'my-inspector',
  name: 'My Inspector',
  icon: 'ph:magnifying-glass-duotone',
  setup(ctx) {
    ctx.rpc.register(defineRpcFunction({
      name: 'my-inspector:getStats',
      type: 'static',
      handler: () => ({ count: 42 }),
    }))
    ctx.docks.register({
      id: 'my-inspector',
      title: 'My Inspector',
      icon: 'ph:magnifying-glass-duotone',
      type: 'iframe',
      url: '/my-inspector/',
    })
  },
})
```

## RPC contract types

| Type       | Use when                                               |
|------------|--------------------------------------------------------|
| `'static'` | Snapshot-able — dump at build time for static SPAs.    |
| `'query'`  | Regular read (may accept args).                        |
| `'action'` | Mutates server state.                                  |
| `'event'`  | Fire-and-forget from client to server.                 |

Add valibot schemas for args / returns when the RPC is user-facing or when you want static-build dumps.

## Author SPA

Authors bring their own SPA. Minimum Vite setup — one `index.html`, one `main.ts` that calls `connectDevtool()` from `devframe/client`.

```ts
import { connectDevtool } from 'devframe/client'
const rpc = await connectDevtool()
const data = await rpc.call('my-inspector:getStats')
```

`connectDevtool` auto-detects the backend (websocket / static / SPA-in-browser).

## Testing

Unit-test host classes with fake contexts; run the counter example under each adapter for integration. Snapshot the build-static `rpc-dump.json`.

## Migration from existing inspectors

See `docs/guide/devframe/migration.md` for step-by-step ports of eslint-config-inspector, node-modules-inspector, and unocss-inspector.
