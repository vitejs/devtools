---
outline: deep
---

# Getting Started

## What is Vite DevTools?

Vite DevTools is a devtools framework for the Vite ecosystem. It provides shared infrastructure — a unified dock, type-safe RPC, shared state, flexible UI hosting — so individual tools compose into one consistent UI and authors focus on what makes their integration unique. Any Vite plugin opts in with a `devtools.setup` hook.

### Built-in integrations

Vite DevTools stays dependency-light and advertises its built-in integrations — [Rolldown](/rolldown/) (build analysis: module graphs, chunks, assets, plugins), [Vite](/vite/) (plugin inspector), [Vitest](/vitest/) (test UI), and [Oxc](/oxc/) (oxlint/oxfmt) — as launchers in the dock. Click one to install its package on demand, then restart the dev server to activate it. Any integration already present in your project is mounted automatically.

### Ecosystem

A growing set of integrations already build on Vite DevTools Kit:

- **[Nuxt DevTools v4](https://github.com/nuxt/devtools)** — built on Vite DevTools Kit
- **[`@vitejs/devtools-oxc`](https://github.com/vitejs/devtools/tree/main/packages/oxc)** — first-party Oxc toolchain (oxlint/oxfmt) inspector with custom RPC functions
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

Enable Vite DevTools in `vite.config.ts`:

```ts [vite.config.ts] twoslash
import { defineConfig } from 'vite'

export default defineConfig({
  devtools: true,
})
```

`devtools: true` enables DevTools for both `vite dev` and `vite build`.

### Limit DevTools to dev or build

The default `apply` value is `'all'`. Set it to `'serve'` or `'build'` to enable DevTools for only that command:

```ts [vite.config.ts] twoslash
import { defineConfig } from 'vite'

export default defineConfig({
  devtools: {
    apply: 'serve',
  },
})
```

### Customize the embedded UI

Vite adds the embedded dock automatically during `vite dev`. Configure its UI through the core `devtools` option.

`embeddedVisibility` controls when the dock appears. The default `'normal'` shows it immediately. `'passive'` hides it until <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>D</kbd> (<kbd>⇧</kbd> <kbd>⌥</kbd> <kbd>D</kbd> on macOS) and remembers when it has been revealed. `'hidden'` uses the same shortcut without remembering the choice.

```ts [vite.config.ts] twoslash
import { defineConfig } from 'vite'

export default defineConfig({
  devtools: {
    apply: 'serve',
    embeddedVisibility: 'passive',
  },
})
```

Use `dockPreferences` to set the initial dock layout. Users can still change these settings in DevTools.

```ts [vite.config.ts] twoslash
import { defineConfig } from 'vite'

export default defineConfig({
  devtools: {
    apply: 'serve',
    dockPreferences: {
      defaultMode: 'edge',
      defaultPosition: 'bottom',
    },
  },
})
```

#### Projects without an HTML entry

For apps where Vite doesn't serve the HTML (JS-only entries, backend integration, middleware mode), import the client injector from a browser entry instead. One entry per visibility mode — import whichever one you want:

```ts twoslash
// Normal: docks shown immediately
import '@vitejs/devtools/client/inject'
```

```ts twoslash
// Passive: docks hidden until Shift+Alt+D, then remembered
import '@vitejs/devtools/client/inject-passive'
```

```ts twoslash
// Hidden: docks hidden until Shift+Alt+D, every session
import '@vitejs/devtools/client/inject-hidden'
```

See [Client Script & Context](/kit/client-context#client-script-not-injected) for how injection works and the full troubleshooting checklist.

### Building with the app

Set `build.withApp` to write the static DevTools files alongside the app build:

```ts [vite.config.ts] twoslash
import { defineConfig } from 'vite'

export default defineConfig({
  devtools: {
    apply: 'build',
    build: {
      withApp: true, // generate DevTools output during `vite build`
      // outDir: 'custom-dir', // optional, defaults to Vite's build.outDir
    },
  },
})
```

Open `/__devtools/` for the full-page UI, or load `/__devtools/embedded.js` to embed the dock in the built app.

## What's next

- **Explore the built-in tools** — inspect Vite development with [Vite DevTools](/vite/) and production builds with [DevTools for Rolldown](/rolldown/).
- **Build custom integrations** — extend DevTools with the [Vite DevTools Kit](/kit/).
- **Contribute** — see the [contributing guide](https://github.com/antfu/contribute).

## Architecture

Vite DevTools is built on **`@vitejs/devtools-kit`**, the integration hub that owns the dock, command palette, terminal aggregation, and the `Plugin.devtools.setup` hook every integration uses. Kit in turn builds on **Devframe**, a framework-neutral foundation that any single tool can use directly — including standalone CLIs, MCP servers, or static dashboards that have no Vite dependency. See [Devframe](https://devfra.me/guide/) for that path.

Integrations like [Nuxt DevTools](https://github.com/nuxt/devtools) and the first-party [`@vitejs/devtools-oxc`](https://github.com/vitejs/devtools/tree/main/packages/oxc) plug into Kit's plugin API. To extend Vite DevTools, see [Vite DevTools Kit](/kit/).
