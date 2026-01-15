---
outline: deep
---

# DevTools Plugin

A DevTools plugin is a **superset** of a Vite plugin—meaning any Vite plugin can become a DevTools plugin by simply adding a `devtools` hook. This allows you to extend the DevTools infrastructure with custom data visualizations, actions, and integrations.

## Installation

To get started, install the `@vitejs/devtools-kit` package in your Vite plugin project. It's typically fine to add it as a dev dependency since we only need it for types on the Node.js side.

```zsh
pnpm install -D @vitejs/devtools-kit
```

Then referencing it in your plugin code, it will augment the `Plugin` interface with the `devtools` property.

Inside `devtools.setup`, you will get tools to register custom data visualization, actions, and more. See the sections below for details on [registering dock entries](./dock-system), and [RPC functions](./rpc).

```ts {1,9-14}
/// <reference types="@vitejs/devtools-kit" />
import { Plugin } from 'vite'

export default function myPlugin(): Plugin {
  return {
    name: 'my-plugin',
    // Do other plugin stuff...
    transform(code, id) {},
    // Devtools setup
    devtools: {
      setup(ctx) {
        console.log('My plugin setup')
      },
    },
  }
}
```

When users run their app with Vite DevTools enabled (`vite dev --ui`), your devtools setup function will be called.

## DevTools Context

The `setup` function receives a `DevToolsNodeContext` which provides access to:

- `ctx.docks`: Manage [dock entries](./dock-system)
- `ctx.views`: Host static views
- `ctx.rpc`: Register [RPC functions](./rpc) or broadcast to clients
- `ctx.utils`: Utility functions
- `ctx.viteConfig`: Vite configuration
- `ctx.viteServer`: Vite dev server (in dev mode)
- `ctx.mode`: Current mode (`'dev'` or `'build'`)

## Next Steps

- Learn how to [register dock entries](./dock-system) to create UI panels, actions, or custom renderers
- Set up [RPC functions](./rpc) for server-client communication
- Use [shared state](./shared-state) to synchronize data between server and client
