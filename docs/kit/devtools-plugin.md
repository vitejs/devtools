---
outline: deep
---

# DevTools Plugin

A DevTools plugin is a Vite plugin with one extra hook: `devtools.setup(ctx)`. The hook receives the kit-augmented context (`KitNodeContext`) — RPC, views, and the four hub subsystems Kit owns: `docks`, `terminals`, `messages`, `commands`.

This page covers the direct hook approach. To bring in a portable [Devframe](https://devfra.me/guide/) app instead, see [`createPluginFromDevframe`](https://devfra.me/guide/adapters#kit) — Kit auto-mounts the SPA, derives the iframe dock entry from `id` / `name` / `icon` / `basePath`, then runs an optional kit-only `setup` for hub features.

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

Add the triple-slash reference to augment Vite's `Plugin` interface with the `devtools` property:

```ts
/// <reference types="@vitejs/devtools-kit" />
import type { Plugin } from 'vite'

export default function myPlugin(): Plugin {
  return {
    name: 'my-plugin',

    // Regular Vite plugin hooks
    configResolved(config) {
      // ...
    },

    // DevTools setup - only called when DevTools is enabled
    devtools: {
      setup(ctx) {
        console.log('DevTools setup for my-plugin')

        // Register dock entries, RPC functions, etc.
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

`devtools.setup` runs once during Vite server initialization, when DevTools is enabled.

## DevTools context

The `setup` function receives a `DevToolsNodeContext` providing access to every DevTools API:

```ts
const plugin: Plugin = {
  devtools: {
    setup(ctx) {
    // ctx contains everything you need
    }
  }
}
```

### Available properties

| Property | Type | Description |
|----------|------|-------------|
| `ctx.docks` | `DocksHost` | Register and manage [dock entries](./dock-system) |
| `ctx.views` | `ViewsHost` | Host static files for your DevTools UI |
| `ctx.rpc` | `RpcHost` | Register [RPC functions](./rpc) and broadcast to clients |
| `ctx.viteConfig` | `ResolvedConfig` | The resolved Vite configuration |
| `ctx.viteServer` | `ViteDevServer \| undefined` | Vite dev server instance, present in dev mode |
| `ctx.mode` | `'dev' \| 'build'` | Current mode |
| `ctx.cwd` | `string` | Current working directory |
| `ctx.workspaceRoot` | `string` | Workspace root directory |

### Example: accessing Vite config

```ts
const plugin: Plugin = {
  devtools: {
    setup(ctx) {
      console.log('Root:', ctx.viteConfig.root)
      console.log('Mode:', ctx.mode)

      if (ctx.viteServer) {
        console.log('Dev server is running')
      }
    }
  }
}
```

## Hosting static files

For a pre-built UI (Vue/React SPA, etc.), serve it with `ctx.views.hostStatic()`:

```ts
import { fileURLToPath } from 'node:url'

const plugin: Plugin = {
  devtools: {
    setup(ctx) {
    // Resolve path to your built client files
      const clientPath = fileURLToPath(
        new URL('../dist/client', import.meta.url)
      )

      // Host at a specific route
      ctx.views.hostStatic('/__my-plugin/', clientPath)

      // Register as a dock entry
      ctx.docks.register({
        id: 'my-plugin',
        title: 'My Plugin',
        icon: 'ph:puzzle-piece-duotone',
        type: 'iframe',
        url: '/__my-plugin/',
      })
    }
  }
}
```

DevTools handles dev-server middleware and copies the static files into the output directory at build time.

## Complete example

A plugin with a dock entry and an RPC function that exposes module data:

```ts
/// <reference types="@vitejs/devtools-kit" />
import type { Plugin } from 'vite'
import { fileURLToPath } from 'node:url'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export default function myAnalyzerPlugin(): Plugin {
  const analyzedModules = new Map<string, { size: number, imports: string[] }>()

  return {
    name: 'my-analyzer',

    // Collect data during transforms
    transform(code, id) {
      analyzedModules.set(id, {
        size: code.length,
        imports: [], // Parse imports here
      })
    },

    devtools: {
      setup(ctx) {
        // Host the UI
        const clientPath = fileURLToPath(
          new URL('../dist/client', import.meta.url)
        )
        ctx.views.hostStatic('/__my-analyzer/', clientPath)

        // Register dock entry
        ctx.docks.register({
          id: 'my-analyzer',
          title: 'Module Analyzer',
          icon: 'ph:chart-bar-duotone',
          type: 'iframe',
          url: '/__my-analyzer/',
        })

        // Register RPC function to fetch data
        ctx.rpc.register(
          defineRpcFunction({
            name: 'my-analyzer:get-modules',
            type: 'query',
            setup: () => ({
              handler: async () => {
                return Array.from(analyzedModules.entries()).map(
                  ([id, data]) => ({ id, ...data })
                )
              },
            }),
          })
        )
      },
    },
  }
}
```

## Debugging with Self Inspect

`@vitejs/devtools-self-inspect` adds a "Self Inspect" panel to DevTools that shows registered RPC functions, dock entries, client scripts, and DevTools-enabled plugins — handy when verifying that everything you registered actually shows up:

```bash
pnpm add -D @vitejs/devtools-self-inspect
```

```ts [vite.config.ts]
import { DevToolsSelfInspect } from '@vitejs/devtools-self-inspect'

export default defineConfig({
  plugins: [
    DevTools(),
    DevToolsSelfInspect(),
    // ...your plugins
  ],
})
```

## Next steps

- **[Dock System](./dock-system)** — iframe panels, action buttons, custom renderers, launchers, json-render specs.
- **[RPC](./rpc)** — bidirectional server-client communication.
- **[Shared State](./shared-state)** — patch-synced state across every connected client.
