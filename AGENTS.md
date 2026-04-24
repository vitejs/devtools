# AGENTS GUIDE

## Stack & Structure

Monorepo (`pnpm` workspaces + `turbo`). ESM TypeScript; bundled with `tsdown`. Path aliases in `alias.ts` (propagated to `tsconfig.base.json` — do not edit manually).

### Packages

| Package | npm | Description |
|---------|-----|-------------|
| `packages/devframe` | `devframe` | Framework-neutral foundation — RPC layer (birpc + valibot + WS presets), host classes, createHostContext, six adapters at `devframe/adapters/*` (cli/build/spa/vite/kit/embedded), connectDevtool client |
| `packages/core` | `@vitejs/devtools` | Vite plugin, CLI, standalone/webcomponents client. Wraps devframe's createHostContext with the Vite plugin scan |
| `packages/kit` | `@vitejs/devtools-kit` | Vite-specific superset of devframe — adds PluginWithDevTools, ViteDevToolsNodeContext, and re-exports devframe's public types |
| `packages/ui` | `@vitejs/devtools-ui` | Shared UI components, composables, and UnoCSS preset (`presetDevToolsUI`). Private, not published |
| `packages/rolldown` | `@vitejs/devtools-rolldown` | Nuxt UI for Rolldown build data. Serves at `/.devtools-rolldown/` |
| `packages/vite` | `@vitejs/devtools-vite` | Nuxt UI for Vite DevTools (WIP). Serves at `/.devtools-vite/` |
| `packages/self-inspect` | `@vitejs/devtools-self-inspect` | Meta-introspection — DevTools for the DevTools. Serves at `/.devtools-self-inspect/` |
| `packages/webext` | — | Browser extension scaffolding (ancillary) |

Other top-level directories:
- `docs/` — VitePress docs; guides in `docs/guide/`
- `skills/` — Agent skill files generated from docs via [Agent Skills](https://agentskills.io/home). Structured references (RPC patterns, dock types, shared state, project structure) for AI agent context.

```mermaid
flowchart TD
  kit --> devframe
  core --> kit
  core --> rolldown & vite & self-inspect
  rolldown --> kit & ui
  vite --> kit & ui
  self-inspect --> kit
  webext --> core
```

## Dep Boundary

`packages/devframe` is the lowest-level package in this monorepo and is positioned to be extracted into its own repo. It MUST NOT import from `vite` or any `@vitejs/*` package — not as a `dependencies` entry, not as an inlined dep, not as a source import. `packages/kit` and above build on top of devframe, never the reverse.

## Architecture

- **Entry**: `createDevToolsContext` (`packages/core/src/node/context.ts`) builds `DevToolsNodeContext` with hosts for RPC, docks, views, terminals. Invokes `plugin.devtools.setup` hooks.
- **Node context**: server-side (cwd, vite config, mode, hosts, auth storage at `node_modules/.vite/devtools/auth.json`).
- **Client context**: webcomponents/Nuxt UI state (`packages/core/src/client/webcomponents/state/*`) — dock entries, panels, RPC client. Two modes: `embedded` (overlay in host app) and `standalone` (independent page).
- **WS server** (`packages/core/src/node/ws.ts`): RPC via `devframe/rpc/transports/ws-server`. Auth skipped in build mode or when `devtools.clientAuth` is `false`.
- **Nuxt UI plugins** (rolldown, vite, self-inspect): each registers RPC functions and hosts static Nuxt SPA at its own base path.

## Development

```sh
pnpm install                          # requires pnpm@10.x
pnpm build                            # turbo run build
pnpm test                             # Vitest
pnpm typecheck                        # vue-tsc -b
pnpm lint --fix                       # ESLint
pnpm -C packages/core run play        # core playground
pnpm -C packages/rolldown run dev     # rolldown UI dev
pnpm -C packages/core run dev:standalone  # standalone client
pnpm -C docs run docs                 # docs dev server
```

## Conventions

- Use workspace aliases from `alias.ts`.
- RPC functions must use `defineRpcFunction` from kit; always namespace IDs (`my-plugin:fn-name`).
- Shared state via `@vitejs/devtools-kit/utils/shared-state`; keep values serializable.
- Nuxt UI base paths: `/.devtools-rolldown/`, `/.devtools-vite/`, `/.devtools-self-inspect/`.
- Shared UI components/preset in `packages/ui`; use `presetDevToolsUI` from `@vitejs/devtools-ui/unocss`.
- Currently focused on Rolldown build-mode analysis; dev-mode support is deferred.

### Devframe design principles

These apply to everything inside `packages/devframe` and to how host packages (`kit`, `core`, etc.) layer on top. When in doubt, err on the side of "devframe provides hooks, the app decides UX".

- **Headless by default.** No default startup banners, no opinionated logging to stdout, no default styling. Provide hooks (`onReady`, `cli.configure`, etc.); let the application print its own branding. Structured diagnostics via `logs-sdk` are fine — ad-hoc `console.log`s baked into adapters are not.
- **File watching is the app's job, not devframe's.** Don't add a generic watcher primitive. Authors wire chokidar / fs.watch / watchman themselves and signal change via `ctx.rpc.sharedState.set(...)` or event-type RPCs. devframe stays out of the filesystem-observation business.
- **Mount path depends on adapter context.** Given `id: 'foo'`, the default mount path is `/.foo/` for *hosted* adapters (`vite`, `kit`, `embedded`) and `/` for *standalone* adapters (`cli`, `spa`, `build`). Authors override via `DevtoolDefinition.basePath`. Don't hardcode `DEVTOOLS_MOUNT_PATH` in adapter code paths that may run standalone.
- **SPAs own their basePath at runtime.** Build SPAs with relative asset paths (`vite.base: './'`); discover the effective base in the browser from the executing script's location / `document.baseURI`. `createBuild` / `createSpa` copy SPA output verbatim — no HTML rewriting, no build-time `--base` injection. The client (`connectDevtool`) resolves `.connection.json` relative to the runtime base automatically.
- **CLI flags compose from both sides.** The `cac` instance backing `createCli` is exposed both to the `DevtoolDefinition` (`cli.configure(cli)`) — for capabilities contributed by the tool itself — and to the `createCli` caller — for flags added at the final assembly stage. Parsed flag values are forwarded to `setup(ctx, { flags })`. Never hardcode domain-specific flags into `createCli`.

## Structured Diagnostics (Error Codes)

All node-side warnings and errors use structured diagnostics via [`logs-sdk`](https://github.com/vercel-labs/logs-sdk). Never use raw `console.warn`, `console.error`, or `throw new Error` with ad-hoc messages in node-side code — always define a coded diagnostic.

### Code prefixes

| Prefix | Package(s) | Diagnostics file |
|--------|-----------|-----------------|
| `DF` | `packages/devframe` | `packages/devframe/src/node/diagnostics.ts`, `packages/devframe/src/rpc/diagnostics.ts` |
| `DTK` | `packages/core` (Vite-specific remainder) | `packages/core/src/node/diagnostics.ts` |
| `RDDT` | `packages/rolldown` | `packages/rolldown/src/node/diagnostics.ts` |
| `VDT` | `packages/vite` (reserved) | — |

Codes are sequential 4-digit numbers per prefix (e.g. `DTK0033`, `RDDT0003`). Check the existing diagnostics file to find the next available number.

### Adding a new error

1. **Define the code** in the appropriate `diagnostics.ts`:
   ```txt
   // diagnostics.ts
   DTK0033: {
     message: (p: { name: string }) => `Something went wrong with "${p.name}"`,
     hint: 'Optional hint for the user.',
     level: 'warn', // defaults to 'error' if omitted
   },
   ```

2. **Use the logger** at the call site:
   ```ts
   import { logger } from './diagnostics'

   // For thrown errors — always prefix with `throw` for TypeScript control flow:
   throw logger.DTK0033({ name }).throw()

   // For logged warnings/errors (not thrown):
   logger.DTK0033({ name }).log() // uses definition level
   logger.DTK0033({ name }).warn() // override to warn
   logger.DTK0033({ name }, { cause: error }).log() // attach cause
   ```

3. **Create a docs page** at `docs/errors/DTK0033.md`:
   ```md
   ---
   outline: deep
   ---
   # DTK0033: Short Title
   > Package: `@vitejs/devtools`
   ## Message
   > Something went wrong with "`{name}`"
   ## Cause
   When and why this occurs.
   ## Example
   Code that triggers it.
   ## Fix
   How to resolve it.
   ## Source
   `packages/core/src/node/filename.ts`
   ```

4. **Update the index** at `docs/errors/index.md` — add a row to the table.

5. **Update the sidebar** in `docs/.vitepress/config.ts` — the DTK items are auto-generated from `Array.from({ length: N })`, so increment the length. RDDT items are listed manually.

### Scope

- **Node-side only**: `packages/rpc`, `packages/core/src/node`, `packages/rolldown/src/node`.
- **Client-side excluded**: Vue components, webcomponents, and browser-only code keep using `console.*` / `throw`.

## Before PRs

```sh
pnpm lint && pnpm test && pnpm typecheck && pnpm build
```

Follow conventional commits (`feat:`, `fix:`, etc.).
