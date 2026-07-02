---
outline: deep
---

# Getting Started

## What is Vite DevTools?

Vite DevTools is a devtools framework for the Vite ecosystem. It provides shared infrastructure — a unified dock, type-safe RPC, shared state, flexible UI hosting — so individual tools compose into one consistent UI and authors focus on what makes their integration unique. Any Vite plugin opts in with a `devtools.setup` hook.

### Built-in integrations

[DevTools for Rolldown](/rolldown/) ships in the box: build analysis, module graphs, chunks, assets, plugins, and performance insights.

### Ecosystem

A growing set of integrations already build on Vite DevTools Kit:

- **[Nuxt DevTools v4](https://github.com/nuxt/devtools)** — built on Vite DevTools Kit
- **[Oxc Inspector](https://github.com/yuyinws/oxc-inspector)** — Kit integration with custom RPC functions
- **[UnoCSS Inspector](https://github.com/unocss/unocss)** — dock integration for UnoCSS
- **[vite-plugin-vue-tracer](https://github.com/antfu/vite-plugin-vue-tracer)** — action button that triggers a DOM inspector

## Installation

Vite DevTools is in early preview. Build from source, or install the preview release with the following steps.

Install or upgrade Vite to version 8:

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

Vite DevTools has two client modes. Pick one.

### Standalone mode

The DevTools client runs in a standalone window.

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

After the build completes, open the DevTools URL printed in the terminal.

### Embedded mode

The DevTools client runs as a floating panel inside the user app.

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

Open your app in the browser; the DevTools panel appears in the corner.

#### Projects without an HTML entry

For apps where Vite doesn't serve the HTML (JS-only entries, backend integration, middleware mode), import the client injector from a browser entry instead:

```ts twoslash
import '@vitejs/devtools/client/inject'
```

See [Client Script & Context](/kit/client-context#client-script-not-injected) for how injection works and the full troubleshooting checklist.

#### Building with the app

Generate a static DevTools build alongside the app build by enabling `build.withApp`:

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

`build.withApp` writes the DevTools static output into the build directory using the same build context, so the analysis panels reflect the real build with no separate command.

## What's next

- **Explore the built-in tools** — open the [DevTools for Rolldown](/rolldown/) panels.
- **Build custom integrations** — extend DevTools with the [Vite DevTools Kit](/kit/).
- **Contribute** — see the [contributing guide](https://github.com/antfu/contribute).

## Architecture

Vite DevTools is built on **`@vitejs/devtools-kit`**, the integration hub that owns the dock, command palette, terminal aggregation, and the `Plugin.devtools.setup` hook every integration uses. Kit in turn builds on **Devframe**, a framework-neutral foundation that any single tool can use directly — including standalone CLIs, MCP servers, or static dashboards that have no Vite dependency. See [Devframe](https://devfra.me/guide/) for that path.

Third-party integrations like [Oxc Inspector](https://github.com/yuyinws/oxc-inspector) plug into Kit's plugin API. To extend Vite DevTools, see [Vite DevTools Kit](/kit/).
