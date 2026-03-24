---
outline: deep
---

# Getting Started

## What is Vite DevTools?

Vite DevTools is a devtools framework for the Vite ecosystem. Instead of each tool building its own devtools from scratch, Vite DevTools provides shared infrastructure — a unified dock system, type-safe RPC, shared state management, and flexible UI hosting — so that different tools compose together seamlessly, users get a consistent experience, and tool authors can focus on what makes their integration unique.

Any Vite plugin can hook into Vite DevTools with just a few lines of code, instantly gaining access to the full platform: panels, action buttons, server-client communication, and more.

### Built-in Integrations

- **[DevTools for Rolldown](/rolldown/)** — Build analysis, module graphs, chunks, assets, plugins, and performance insights
- **DevTools for Vite** — Vite-specific developer tools *(in development)*

### Ecosystem

Vite DevTools Kit is already powering a growing ecosystem of integrations:

- **[Nuxt DevTools v4](https://github.com/nuxt/devtools)** — Built on top of Vite DevTools Kit
- **[Oxc Inspector](https://github.com/yuyinws/oxc-inspector)** — Integrates via DevTools Kit with custom RPC functions
- **[UnoCSS Inspector](https://github.com/unocss/unocss)** — Dock integration for UnoCSS
- **[vite-plugin-vue-tracer](https://github.com/antfu/vite-plugin-vue-tracer)** — Action button that triggers a DOM inspector

### Key Features

- **🧩 Extensible Framework**: Any Vite plugin can extend the devtools with a simple hook
- **🔍 [DevTools for Rolldown](/rolldown/)**: Built-in build analysis with module graphs, dependencies, and build metadata
- **🎨 Unified Interface**: All DevTools integrations appear in a consistent dock interface
- **🔌 Type-Safe RPC**: Built-in bidirectional communication between server and client
- **⚡ Shared State**: Automatic synchronization of data between server and client

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

#### Building with the App

You can also generate a static DevTools build alongside your app's build output by enabling the `build.withApp` option:

```ts [vite.config.ts] twoslash
import { DevTools } from '@vitejs/devtools'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    DevTools({
      build: {
        withApp: true, // generate DevTools output during `vite build`
        // outDir: 'custom-dir', // optional, defaults to Vite's build.outDir
      },
    }),
  ],
  build: {
    rolldownOptions: {
      devtools: {},
    },
  }
})
```

When `build.withApp` is enabled, running `pnpm build` will automatically generate the static DevTools output into the build output directory. This captures real build data from the same build context, so DevTools can display accurate build analysis without a separate build step.

## What's Next?

Now that you have Vite DevTools set up, you can:

- **Explore the built-in tools**: Check out the [DevTools for Rolldown](/rolldown/) panels and visualizations
- **Build custom integrations**: Learn how to extend the devtools with your own tools using the [Vite DevTools Kit](/kit/)
- **Contribute**: Help improve Vite DevTools by checking out our [contributing guide](https://github.com/antfu/contribute)

## Current Limitations

> [!NOTE]
> Vite DevTools is currently in active development.

- **[DevTools for Rolldown](/rolldown/)**: Currently supports build mode only, requires Vite 8+
- **Dev mode**: Dev mode support is planned for future releases

## Architecture Overview

Vite DevTools consists of several core packages:

- **`@vitejs/devtools`**: The core framework, CLI, and runtime hosts
- **`@vitejs/devtools-kit`**: Vite DevTools Kit — utilities and types for building custom integrations
- **`@vitejs/devtools-rolldown`**: [DevTools for Rolldown](/rolldown/) — built-in build analysis UI
- **`@vitejs/devtools-vite`**: DevTools for Vite *(in development)*
- **`@vitejs/devtools-rpc`**: RPC layer for server-client communication

Third-party integrations like [Oxc Inspector](https://github.com/yuyinws/oxc-inspector) can also integrate via the DevTools Kit plugin API.

For more details on extending the devtools, see the [Vite DevTools Kit documentation](/kit/).
