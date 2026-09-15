---
outline: deep
---

# DevTools Kit

`@vitejs/devtools-kit` is the Vite-flavored layer for building integrations that appear inside Vite DevTools. It gives a Vite plugin one extra hook — `devtools.setup(ctx)` — and a context wired with everything an integration needs: a dock to surface UI, RPC, shared state, terminals, commands, and messages.

Kit is a thin skin over [Devframe](https://devfra.me/guide/) and its hub layer. Devframe is the framework-neutral foundation that owns the mechanics — [RPC](https://devfra.me/guide/rpc), [shared state](https://devfra.me/guide/shared-state), [json-render](https://devfra.me/guide/json-render), [streaming](https://devfra.me/guide/streaming), [when clauses](https://devfra.me/references/when-clauses), and the hub's [docks, commands, messages, and terminals](https://devfra.me/guide/hub). Kit re-exports those under Vite-friendly names and adds the Vite-specific pieces: the `devtools.setup` hook, the `viteConfig` / `viteServer` context slots, the `/__devtools/` mount path, and the bridge that drops a portable devframe into Vite DevTools.

![DevTools Kit Vision](/assets/vision-devtools-kit.jpg)

For background, see [Anthony Fu's ViteConf 2025 talk](https://www.youtube.com/watch?v=tVd0JeSr8kg).

## Two ways to build

**Author a Vite plugin.** Add a `devtools.setup` hook to any Vite plugin and register a dock entry. This is the shortest path for a Vite-only integration.

```ts
/// <reference types="@vitejs/devtools-kit" />
import type { Plugin } from 'vite'

export default function myPlugin(): Plugin {
  return {
    name: 'my-plugin',
    devtools: {
      setup(ctx) {
        ctx.docks.register({
          id: 'my-plugin',
          title: 'My Plugin',
          icon: 'ph:puzzle-piece-duotone',
          type: 'iframe',
          url: '/__my-plugin/',
        })
      },
    },
  }
}
```

**Bring a portable devframe.** If your tool is a [Devframe definition](https://devfra.me/guide/devframe-definition) — so it also runs standalone, as a CLI, or through a coding agent — wrap it once and Kit synthesizes the iframe dock entry for you.

```ts
// vite.config.ts
import { createPluginFromDevframe } from '@vitejs/devtools-kit/node'
import devtool from './my-devtool'

export default {
  plugins: [createPluginFromDevframe(devtool)],
}
```

## Pages

- **[DevTools Plugin](./devtools-plugin)** — the `devtools.setup` hook, the Vite-augmented context, and hosting a static UI.
- **[Dock System](./dock-system)** — registering dock entries and adding on-demand install launchers.
- **[Create Plugin from Devframe](./create-plugin-from-devframe)** — mount a portable devframe as a Vite plugin.

For the mechanics shared with every host framework — RPC, shared state, streaming, json-render, when clauses, and the hub subsystems — see the [Devframe docs](https://devfra.me/guide/).

If you're shipping something on Kit, tag the repo with `vite-devtools` on GitHub so we can see what folks are building.
