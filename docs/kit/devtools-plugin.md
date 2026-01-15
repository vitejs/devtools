---
outline: deep
---

# DevTools Plugin

A DevTools plugin is a **superset** of a Vite plugin—meaning any Vite plugin can become a DevTools plugin by simply adding a `devtools` hook. This allows you to extend the DevTools infrastructure with custom data visualizations, actions, and integrations.

## Installation

Install the `@vitejs/devtools-kit` package in your Vite plugin project:

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

> [!NOTE]
> It's typically fine to add it as a dev dependency since we only need it for types on the Node.js side.

## Basic Setup

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
          url: '/.my-plugin/',
        })
      },
    },
  }
}
```

> [!TIP] When is `setup` called?
> The `devtools.setup` function is called when users run their app with Vite DevTools enabled via `vite dev --ui` or `vite build --ui` (not implemented in Vite yet). It runs once during Vite server initialization.

## DevTools Context

The `setup` function receives a `DevToolsNodeContext` object that provides access to all DevTools APIs:

```ts
const plugin: Plugin = {
  devtools: {
    setup(ctx) {
    // ctx contains everything you need
    }
  }
}
```

### Available Properties

| Property | Type | Description |
|----------|------|-------------|
| `ctx.docks` | `DocksHost` | Register and manage [dock entries](./dock-system) |
| `ctx.views` | `ViewsHost` | Host static files for your DevTools UI |
| `ctx.rpc` | `RpcHost` | Register [RPC functions](./rpc) and broadcast to clients |
| `ctx.viteConfig` | `ResolvedConfig` | The resolved Vite configuration |
| `ctx.viteServer` | `ViteDevServer \| undefined` | Vite dev server instance (only in dev mode) |
| `ctx.mode` | `'dev' \| 'build'` | Current mode |
| `ctx.cwd` | `string` | Current working directory |
| `ctx.workspaceRoot` | `string` | Workspace root directory |

### Example: Accessing Vite Config

```ts
const plugin: Plugin = {
  devtools: {
    setup(ctx) {
      // Access Vite configuration
      console.log('Root:', ctx.viteConfig.root)
      console.log('Mode:', ctx.mode)

      // Check if we're in dev mode
      if (ctx.viteServer) {
        console.log('Dev server is running')
      }
    }
  }
}
```

## Hosting Static Files

If you have a pre-built UI (e.g., a Vue/React SPA), use `ctx.views.hostStatic()` to serve it:

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
      ctx.views.hostStatic('/.my-plugin/', clientPath)

      // Register as a dock entry
      ctx.docks.register({
        id: 'my-plugin',
        title: 'My Plugin',
        icon: 'ph:puzzle-piece-duotone',
        type: 'iframe',
        url: '/.my-plugin/',
      })
    }
  }
}
```

DevTools handles:
- Dev server middleware to serve the static files
- Copying static files to the output directory during production builds

## Complete Example

Here's a complete example showing a DevTools plugin with dock entry, RPC function, and shared state:

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
        ctx.views.hostStatic('/.my-analyzer/', clientPath)

        // Register dock entry
        ctx.docks.register({
          id: 'my-analyzer',
          title: 'Module Analyzer',
          icon: 'ph:chart-bar-duotone',
          type: 'iframe',
          url: '/.my-analyzer/',
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

## Next Steps

- **[Dock System](./dock-system)** - Learn about different dock entry types (iframe, action, custom renderer)
- **[RPC](./rpc)** - Set up bidirectional server-client communication
- **[Shared State](./shared-state)** - Synchronize state between server and all clients
