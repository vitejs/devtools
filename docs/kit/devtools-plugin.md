---
outline: deep
---

# DevTools Plugin

A DevTools plugin is a Vite plugin with one extra hook: `devtools.setup(ctx)`. It runs once during Vite server initialization, only when DevTools is enabled, and receives the Vite-augmented context — RPC, views, shared state, and the hub subsystems (`docks`, `terminals`, `messages`, `commands`) — plus Vite's own `viteConfig` and `viteServer`.

To bring in a portable [Devframe](https://devfra.me/guide/) app instead of writing the hook by hand, see [Create Plugin from Devframe](./create-plugin-from-devframe).

## Installation

`@vitejs/devtools-kit` is fine as a dev dependency — Node-side code only consumes it for types.

::: code-group

```bash [pnpm]
pnpm add -D @vitejs/devtools-kit
```

```bash [npm]
npm install -D @vitejs/devtools-kit
```

```bash [yarn]
yarn add -D @vitejs/devtools-kit
```

:::

## Basic setup

Add the triple-slash reference to augment Vite's `Plugin` interface with the `devtools` property, then register a dock entry in `setup`:

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

## The context

`setup` receives a `ViteDevToolsNodeContext`. The Vite-specific slots are:

| Property | Type | Description |
|----------|------|-------------|
| `ctx.viteConfig` | `ResolvedConfig` | The resolved Vite configuration |
| `ctx.viteServer` | `ViteDevServer \| undefined` | The dev server instance, present in dev mode |
| `ctx.mode` | `'dev' \| 'build'` | Current mode |
| `ctx.cwd` | `string` | Current working directory |
| `ctx.workspaceRoot` | `string` | Workspace root directory |
| `ctx.views` | `ViewsHost` | Host static files for your UI (`hostStatic`) |
| `ctx.docks` | `DocksHost` | Register [dock entries](./dock-system) |

The context also carries the subsystems from the hub: [`ctx.rpc`](./rpc), [`ctx.rpc.sharedState`](./shared-state), [`ctx.terminals`](./terminals), [`ctx.commands`](./commands), [`ctx.messages`](./messages), and [`ctx.diagnostics`](./diagnostics).

```ts
const plugin: Plugin = {
  devtools: {
    setup(ctx) {
      console.log('Root:', ctx.viteConfig.root)
      if (ctx.viteServer) {
        console.log('Dev server is running')
      }
    },
  },
}
```

## Hosting a static UI

For a pre-built SPA (Vue/React/Svelte/etc.), serve it with `ctx.views.hostStatic()` and point an iframe dock entry at the same route. DevTools handles dev-server middleware and copies the files into the build output at build time.

```ts
import { fileURLToPath } from 'node:url'

const plugin: Plugin = {
  devtools: {
    setup(ctx) {
      const clientPath = fileURLToPath(new URL('../dist/client', import.meta.url))
      ctx.views.hostStatic('/__my-plugin/', clientPath)

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
```

## Complete example

A plugin that hosts a UI, exposes module data over RPC, and surfaces a dock entry:

```ts
/// <reference types="@vitejs/devtools-kit" />
import type { Plugin } from 'vite'
import { fileURLToPath } from 'node:url'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export default function myAnalyzerPlugin(): Plugin {
  const analyzedModules = new Map<string, { size: number }>()

  return {
    name: 'my-analyzer',

    transform(code, id) {
      analyzedModules.set(id, { size: code.length })
    },

    devtools: {
      setup(ctx) {
        const clientPath = fileURLToPath(new URL('../dist/client', import.meta.url))
        ctx.views.hostStatic('/__my-analyzer/', clientPath)

        ctx.docks.register({
          id: 'my-analyzer',
          title: 'Module Analyzer',
          icon: 'ph:chart-bar-duotone',
          type: 'iframe',
          url: '/__my-analyzer/',
        })

        ctx.rpc.register(
          defineRpcFunction({
            name: 'my-analyzer:get-modules',
            type: 'query',
            setup: () => ({
              handler: async () =>
                Array.from(analyzedModules, ([id, data]) => ({ id, ...data })),
            }),
          }),
        )
      },
    },
  }
}
```

RPC function shapes and the client-side call API are covered in [RPC](./rpc).

## Debugging with the inspector

Vite DevTools ships the official `@devframes/plugin-inspect` inspector as a built-in panel (enabled by default with `builtinDevTools`). It shows registered RPC functions, dock entries, client scripts, and DevTools-enabled plugins — handy for verifying that what you registered actually shows up. Open the **Inspect** dock; no extra install needed.

## Next steps

- **[Dock System](./dock-system)** — dock entry types and install launchers.
- **[RPC](./rpc)** and **[Shared State](./shared-state)** — server ↔ client communication.
- **[Create Plugin from Devframe](./create-plugin-from-devframe)** — mount a portable devframe.
