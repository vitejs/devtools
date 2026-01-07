---
outline: deep
---

# Getting Started

> [!WARNING]
> Vite DevTools is still in development and not yet ready for production use.
> And currently Vite DevTools is designed only for Vite-Rolldown's build mode.
> Dev mode and normal Vite are not supported yet.

## What is Vite DevTools?

Vite DevTools is a comprehensive set of developer tools for visualizing and analyzing your Vite build process. It provides deep insights into your build pipeline, module dependencies, and build metadata, helping you understand and optimize your Vite applications.

### Key Features

- **🔍 Build Analysis**: Visualize module graphs, dependencies, and build metadata
- **📊 Performance Insights**: Understand build performance and bottlenecks
- **🧩 Extensible**: Build custom DevTools integrations with the DevTools Kit
- **🎨 Unified Interface**: All DevTools integrations appear in a consistent dock interface
- **⚡ Type-Safe**: Full TypeScript support with type-safe RPC communication

## Installation

If you want to give an early preview, you can try it out by building this project from source, or install the preview build with the following steps:

Switch your Vite to [Rolldown Vite](https://vite.dev/guide/rolldown#how-to-try-rolldown):

<!-- eslint-skip -->
```json [package.json]
{
  "dependencies": {
    "vite": "^7.0.0" // [!code --]
    "vite": "npm:rolldown-vite@latest" // [!code ++]
  }
}
```

Install the DevTools plugin:

```bash
pnpm add -D @vitejs/devtools
```

Enable the DevTools plugin in your Vite config and turn on the devtools mode for Rolldown:

```ts [vite.config.ts] twoslash
import { DevTools } from '@vitejs/devtools'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    DevTools(),
  ],
  build: {
    rolldownOptions: {
      devtools: {}, // enable devtools mode
    },
  }
})
```

Run your Vite build, to generate the Rolldown build metadata:

```bash
pnpm build
```

Open the DevTools panel in your browser to play with the DevTools:

```bash
pnpm dev
```

## What's Next?

Now that you have Vite DevTools set up, you can:

- **Explore the built-in tools**: Check out the various panels and visualizations available in the DevTools interface
- **Build custom integrations**: Learn how to extend Vite DevTools with your own tools using the [DevTools Kit](/kit/)
- **Contribute**: Help improve Vite DevTools by checking out our [contributing guide](https://github.com/antfu/contribute)

## Current Limitations

> [!NOTE]
> Vite DevTools is currently in active development with the following limitations:

- **Build mode only**: Currently works with Vite-Rolldown's build mode
- **Dev mode**: Not yet supported (planned for future releases)
- **Standard Vite**: Requires Rolldown Vite for now

## Architecture Overview

Vite DevTools consists of several core packages:

- **`@vitejs/devtools`**: The main entry point and CLI
- **`@vitejs/devtools-kit`**: Utilities and types for building custom integrations
- **`@vitejs/devtools-vite`**: Built-in UI panel for Vite/Rolldown
- **`@vitejs/devtools-rpc`**: RPC layer for server-client communication

For more details on extending Vite DevTools, see the [DevTools Kit documentation](/kit/).
