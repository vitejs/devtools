# Contributing

Thank you for your interest in contributing to Vite DevTools! Before submitting your contribution, please take a moment to read through the following guidelines.

Please be aware that we are still in the early stages of development, and huge refactoring occasionally are expected.

We are currently focusing on getting the basic data visualization working for **Vite-Rolldown's build mode**. Dev mode will be delayed for later until Vite get the full-bundler dev mode.

You can check the [TODO list](https://github.com/vitejs/devtools/issues/9) (excluding `hold-off`) if you are interested in helping out.

## Setup

Requires pnpm.

```bash
pnpm install
pnpm build  # Required: generates Rolldown meta under ./packages/rolldown/node_modules/.rolldown

# Start Rolldown devtools UI
pnpm dev:rolldown
# Start Vite devtools UI
pnpm dev:vite
# Core playground (host app with DevTools overlay)
pnpm play
# Standalone client dev
pnpm play:standalone
```

**Note**: After pulling latest commits, remove `./packages/rolldown/node_modules/.rolldown` and rebuild to get the latest data format.

## Project Structure

Monorepo with pnpm workspaces. Each package's scope:

### `packages/core` - `@vitejs/devtools`

Main entry point and core functionality.

- CLI (`vite-devtools` command)
- Client-side injection scripts
- Standalone mode
- WebComponents UI (Dock, Panels, Terminals)
- Node.js server for DevTools UI
- RPC server/client setup
- Host functions and docks management

**Key files**: `src/node/cli.ts`, `src/node/server.ts`, `src/client/webcomponents/`

---

### `packages/kit` - `@vitejs/devtools-kit`

Vite APIs on top of `@devframes/hub` for integration authors.

- Vite-augmented context (`createKitContext`) and `createPluginFromDevframe`
- Hub hosts re-exported under `DevTools*` aliases (docks, terminals, messages, commands)
- `defineRpcFunction` (RPC lives in the external `devframe/rpc` package)
- Shared-state and when-clause utilities

**Key files**: `src/node/` (context + `createPluginFromDevframe`), `src/client/`, `src/define.ts`, `src/types/`

---

### `packages/rolldown` - `@vitejs/devtools-rolldown`

Built-in UI panel for Rolldown integration.

- Vite plugin (enabled by default)
- Nuxt-based UI for build visualization
- Rolldown build output integration
- Build analysis panels, module graph, file inspection

**Key files**: `src/index.ts` (plugin entry), `src/` (Nuxt app)

**Note**: Build generates Rolldown metadata in `node_modules/.rolldown` folder.

---

### `packages/vite` - `@vitejs/devtools-vite`

UI for inspecting the Vite dev server's plugin pipeline and module transforms. Hub-mounted via `Plugin.devtools.setup`. Serves at `/__devtools-vite/`.

---

### `packages/ui` - `@vitejs/devtools-ui`

Shared UI components, composables, and UnoCSS preset (`presetDevToolsUI`). Private, not published.

---

### `packages/oxc` - `@vitejs/devtools-oxc`

Oxc toolchain (oxlint/oxfmt) inspector. Advertised by core as a built-in install launcher in the `viteplus` group; mounted via `DevToolsOxc()` from `@vitejs/devtools-oxc/vite` once installed.

**Key files**: `src/node/` (plugin + RPC), `src/app/` (Nuxt UI)

Lint this package with `pnpm -C packages/oxc lint` — it stays out of the shared ESLint run because oxfmt conflicts with the repo-wide antfu config.

---

### `packages/vitest` - `@vitejs/devtools-vitest`

Slim launcher for the Vitest UI in the `viteplus` dock group. A `launcher` dock (shown when the project uses Vitest) installs `@vitest/ui` on demand, spawns `vitest --ui`, then swaps to an iframe.

---

### `packages/webext` - `@vitejs/devtools-webext`

Browser extension scaffolding (ancillary).

---

RPC is provided by the external `devframe` package (`devframe/rpc`). Define functions with `defineRpcFunction` from `@vitejs/devtools-kit` and namespace their ids — see `AGENTS.md`.

---

## Scripts

- `pnpm build` - Build all packages (via turbo)
- `pnpm watch` - Watch mode for all packages
- `pnpm play` - Core playground (host app with DevTools overlay)
- `pnpm play:standalone` - Standalone client dev
- `pnpm dev:rolldown` - Rolldown UI dev server
- `pnpm dev:vite` - Vite UI dev server
- `pnpm docs` - VitePress docs dev server
- `pnpm lint` - ESLint (pass `--fix` to auto-fix)
- `pnpm test` - Vitest
- `pnpm typecheck` - vue-tsc type check

## Workflow

1. For new features: open an issue first for discussion
2. Make changes, run `pnpm test && pnpm typecheck && pnpm lint`
3. Use conventional commits (`feat:`, `fix:`, etc.)
4. Submit PR with clear description and related issue reference

## Package Guidelines

- **core**: CLI in `cli-commands.ts`, server in `server.ts`, components in `client/webcomponents/`
- **kit**: Keep APIs stable, add types for public APIs, consider backward compatibility
- **vite** / **rolldown** / **oxc**: Nuxt 4 app, Vue 3 Composition API; RPC via `defineRpcFunction` with namespaced ids
- **oxc**: Lint and format with the package's own oxlint/oxfmt (`pnpm -C packages/oxc lint`)
