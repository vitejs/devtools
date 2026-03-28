# Contributing

Thank you for your interest in contributing to Vite DevTools! Before submitting your contribution, please take a moment to read through the following guidelines.

Please be aware that we are still in the early stages of development, and huge refactoring occasionally are expected.

We are currently focusing on getting the basic data visualization working for **Vite-Rolldown's build mode**. Dev mode will be delayed for later until Vite get the full-bundler dev mode.

You can check the [TODO list](https://github.com/vitejs/devtools/issues/9) (excluding `hold-off`) if you are interested in helping out.

## Setup

Requires `pnpm@10.x`.

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

Utility library for integration authors.

- TypeScript types and interfaces for docks, views, panels
- `defineRpcFunction` and shared state utilities
- Event system utilities
- RPC client helpers

**Key files**: `src/index.ts`, `src/client.ts`, `src/utils/`

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

UI for Vite DevTools (WIP).

---

### `packages/ui` - `@vitejs/devtools-ui`

Shared UI components, composables, and UnoCSS preset (`presetDevToolsUI`).

---

### `packages/rpc` - `@vitejs/devtools-rpc`

Typed RPC wrapper over `birpc` with WebSocket presets.

- RPC client/server implementations
- WebSocket presets
- Message serialization
- Type-safe RPC methods

**Key files**: `src/index.ts`, `src/client.ts`, `src/server.ts`, `src/presets/ws/`

---

### `packages/self-inspect` - `@vitejs/devtools-self-inspect`

Meta-introspection — DevTools for the DevTools itself.

---

### `packages/webext` - `@vitejs/devtools-webext`

Browser extension (planned for future dev mode). **Not accepting contributions currently.**

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
- **vite**: Nuxt 4 app, Vue 3 Composition API, test with `pnpm dev` after build
- **rpc**: Keep methods type-safe, document new methods, test client/server
