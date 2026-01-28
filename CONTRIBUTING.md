# Contributing

Thank you for your interest in contributing to Vite DevTools! Before submitting your contribution, please take a moment to read through the following guidelines.

Please be aware that we are still in the early stages of development, and huge refactoring occasionally are expected.

We are currently focusing on getting the basic data visualization working for **Vite-Rolldown's build mode**. Dev mode will be delayed for later until Vite get the full-bundler dev mode.

You can check the [TODO list](https://github.com/vitejs/devtools/issues/9) (excluding `hold-off`) if you are interested in helping out.

## Setup

```bash
pnpm install
pnpm build  # Required: generates Rolldown meta under ./packages/rolldown/node_modules/.rolldown
pnpm dev    # Start dev server
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

- TypeScript types and interfaces
- Utilities for custom docks, views, panels
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

### `packages/rpc` - `@vitejs/devtools-rpc`

RPC layer for component communication.

- RPC client/server implementations
- WebSocket presets
- Message serialization
- Type-safe RPC methods

**Key files**: `src/index.ts`, `src/client.ts`, `src/server.ts`, `src/presets/ws/`

---

### `packages/webext` - `@vitejs/devtools-webext`

Browser extension (planned for future dev mode). **Not accepting contributions currently.**

---

## Scripts

- `pnpm build` - Build all packages
- `pnpm watch` - Watch mode
- `pnpm dev` - Dev server
- `pnpm lint` - ESLint
- `pnpm test` - Vitest
- `pnpm typecheck` - Type check

Package-specific: `pnpm -C packages/core run cli`, `pnpm -C packages/rolldown run dev`

## Workflow

1. For new features: open an issue first for discussion
2. Make changes, run `pnpm test && pnpm typecheck && pnpm lint`
3. Use conventional commits (`feat:`, `fix:`, etc.)
4. Submit PR with clear description and related issue reference

## Package Guidelines

- **core**: CLI in `cli-commands.ts`, server in `server.ts`, components in `client/webcomponents/`
- **kit**: Keep APIs stable, add types for public APIs, consider backward compatibility
- **vite**: Nuxt 3 app, Vue 3 Composition API, test with `pnpm dev` after build
- **rpc**: Keep methods type-safe, document new methods, test client/server
