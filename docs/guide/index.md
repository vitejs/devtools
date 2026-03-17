---
outline: deep
---

# Getting Started

> [!WARNING]
> Vite DevTools currently only supports Vite-Rolldown's build mode.
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

Install or upgrade your Vite to version 8:

<!-- eslint-skip -->
```json [package.json]
{
  "dependencies": {
    "vite": "^8.0.0"
  }
}
```

Install the required DevTools package:

```bash
pnpm add -D @vitejs/devtools
```

Vite DevTools has two client modes. Configure one mode at a time.

### Standalone mode

The DevTools client runs in a standalone window (no user app).

Configure `vite.config.ts`:

```ts [vite.config.ts] twoslash
import { defineConfig } from 'vite'

export default defineConfig({
  devtools: {
    enabled: true,
  },
})
```

Run:

```bash
pnpm build
```

After the build completes, open the DevTools URL shown in the terminal.

### Embedded mode

The DevTools client runs inside an embedded floating panel.

Configure `vite.config.ts`:

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

Run:

```bash
pnpm build
pnpm dev
```

Then open your app in the browser and open the DevTools panel.

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
- **`@vitejs/devtools-rolldown`**: Built-in UI panel for Rolldown
- **`@vitejs/devtools-rpc`**: RPC layer for server-client communication

For more details on extending Vite DevTools, see the [DevTools Kit documentation](/kit/).
