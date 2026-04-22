# Migrating an inspector to takubox

If you maintain a devtool today (ESLint config inspector, UnoCSS
inspector, node-modules-inspector, or anything with a custom CLI +
WebSocket RPC + static build), takubox absorbs the re-implementation
of that stack. Your inspector becomes a single `DevtoolDefinition`
plus an author-provided SPA.

## Mapping table

| Today's concept                        | Takubox equivalent                                  |
|----------------------------------------|-----------------------------------------------------|
| Custom CLI (cac)                       | `createCli(devtool).parse()`                        |
| h3 + ws server setup                   | Automatic via `createCli` or `toKitPlugin`          |
| Payload endpoint + WebSocket           | `ctx.rpc.register(defineRpcFunction({ type: 'static' }))` + shared state |
| chokidar file watch + broadcast        | `ctx.host.on('reload', …)` / emit via shared state  |
| Custom `Backend` abstraction           | `connectDevtool` — backend auto-detection built-in |
| Static build with baked payload        | `buildStatic` or `buildSpa`                         |
| `/api/metadata.json`                   | `/.devtools/.connection.json`                       |

## Ports (forward-looking)

### eslint-config-inspector

Re-express as a `DevtoolDefinition`. Delete its own cac / h3 / ws /
chokidar / static-build code — the adapters cover it. Its existing
Nuxt SPA becomes the `cli.distDir`.

### node-modules-inspector

Replace the custom `Backend` abstraction with `connectDevtool()`. The
`webcontainer` backend is retired — migrate to the SPA adapter with
`setupBrowser` performing the npm-registry calls directly in-browser.

### unocss-inspector (Vite plugin only)

Adopt `takuboxVite(devtool)` for the plain Vite case, or
`toKitPlugin(devtool)` if embedding in Vite DevTools.

## Common gotchas

- **Auth tokens** — the default takubox auth flow mirrors Vite
  DevTools'; set `clientAuth: false` via a host option for local-only
  tools that don't need the auth handshake.
- **Write-disabled mode** — the static / SPA adapters expose a
  read-only client. Surface the state clearly in your UI.
- **HMR vs shared-state** — for reactive data, prefer `ctx.rpc.sharedState`
  over ad-hoc HMR events; shared-state survives reconnects.

## DTK → TKB redirect

DTK codes from the framework-neutral host surface moved to
takubox-owned TKB codes (see `docs/errors/TKB*`). Vite-specific codes
keep the DTK prefix. Deep links to legacy DTK docs continue to work
for one release cycle.
