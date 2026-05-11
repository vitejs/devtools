---
outline: deep
---

# Adapters

An adapter takes a `DevframeDefinition` and deploys it into a specific runtime — a standalone CLI, a Vite plugin, a static snapshot, an SPA, a Kit plugin, an embedded host, or an MCP server. Each adapter ships at its own entry point (`devframe/adapters/<name>`); the bundler pulls in only the ones you use.

Every adapter factory has the shape `createXxx(devframeDef, options?)`.

## Comparison

| Adapter | Entry | Factory | Best for |
|---------|-------|---------|----------|
| [`cli`](#cli) | `devframe/adapters/cli` | `createCli(def, options?)` | Standalone tools run via `node ./my-tool.js` |
| [`dev`](#dev) | `devframe/adapters/dev` | `createDevServer(def, options?)` | Run the dev server programmatically — drive it from any CLI framework |
| [`vite`](#vite) | `devframe/adapters/vite` | `createVitePlugin(def, options?)` | Mount a tool's UI inside an existing Vite dev server |
| [`build`](#build) | `devframe/adapters/build` | `createBuild(def, options?)` | Offline reports, CI artifacts, deployable SPA snapshots |
| [`kit`](#kit) | `@vitejs/devtools-kit/node` | `createPluginFromDevframe(def, options?)` | Integrating into Vite DevTools Kit |
| [`embedded`](#embedded) | `devframe/adapters/embedded` | `createEmbedded(def, { ctx })` | Runtime registration into an already-running host |
| [`mcp`](#mcp) | `devframe/adapters/mcp` | `createMcpServer(def, options?)` | Exposing a devframe to coding agents |

## CLI

The CLI adapter wraps a `DevframeDefinition` in a `cac`-powered command-line interface. From one entry it spins up an `h3` dev server with WebSocket RPC, builds static snapshots, builds SPA bundles, or starts an MCP server.

```ts
import { defineDevframe } from 'devframe'
import { createCli } from 'devframe/adapters/cli'

const devframe = defineDevframe({
  id: 'my-devframe',
  name: 'My Devframe',
  cli: { distDir: './client/dist' },
  setup(ctx) { /* register docks, RPC, etc. */ },
})

await createCli(devframe).parse()
```

Running the resulting binary:

```sh
my-devframe                     # dev server at http://localhost:9999/
my-devframe --port 8080
my-devframe build --out-dir dist-static
my-devframe build --out-dir dist-static --base /devtools/
my-devframe mcp                 # stdio MCP server (experimental)
```

Standalone CLI serves the SPA at `/` by default. The `/__devtools/` prefix is for *hosted* adapters where devframe mounts alongside an existing app — see [Mount paths](#mount-paths).

### Options

`createCli(def, options?)` accepts:

| Option | Default | Description |
|--------|---------|-------------|
| `defaultPort` | `9999` (or `def.cli?.port`) | Port used by the dev command when `--port` isn't provided. |
| `configureCli` | — | `(cli: CAC) => void` — final hook to add commands/flags at the assembly stage, after the definition's `cli.configure` runs. |
| `onReady` | — | `(info: { origin, port, app }) => void \| Promise<void>` — called once the dev server is listening. Use this to print your own startup banner. |

`createCli` returns a `CliHandle`:

```ts
interface CliHandle {
  cli: CAC // raw cac instance — mutate before calling parse()
  parse: (argv?: string[]) => Promise<void>
}
```

The `cli` property lets the caller add ad-hoc commands and flags right before `parse()` when a `configureCli` callback is inconvenient.

### Definition-level `cli` fields

```ts
defineDevframe({
  id: 'my-devframe',
  cli: {
    command: 'my-devframe', // binary name; default: the id
    distDir: './client/dist', // required for dev/build/spa
    port: 7777, // preferred port
    portRange: [7777, 9000], // passed through to get-port-please
    random: false, // passed through to get-port-please
    host: '127.0.0.1', // default host; --host overrides
    open: true, // auto-open the browser on dev start
    auth: false, // skip the trust handshake (single-user localhost)
    configure(cli) { // contribute capability flags/commands
      cli.option('--config <file>', 'Custom config file')
        .option('--no-files', 'Skip file matching')
    },
  },
  setup(ctx, { flags }) {
    // `flags` is the parsed cac flag bag — includes both devframe's
    // built-ins (`--port`, `--host`, `--open`) and anything declared in
    // `cli.configure` or `configureCli`.
  },
})
```

`distDir` is the only required field; everything else has sensible defaults. The `configure` hook runs *before* the `configureCli` option passed to `createCli`, so the final tool author always has the last word on flags.

### Headless logging

Devframe leaves startup output to the application. Wire `onReady` to print your own banner:

```ts
await createCli(devframe, {
  onReady({ origin }) {
    console.log(`ESLint Config Inspector ready at ${origin}`)
  },
}).parse()
```

Structured diagnostics (via `logs-sdk`) continue to surface through their normal reporters.

### Use your own CLI framework

To integrate devframe into an existing commander / yargs program — or to expose a different command structure than `createCli`'s `dev` / `build` / `mcp` triplet — drop down to the peer factories. Same `DevframeDefinition`, different shell:

| Building block | Entry | Purpose |
|----------------|-------|---------|
| [`createDevServer(def, opts?)`](#dev) | `devframe/adapters/dev` | h3 + WebSocket RPC + SPA mount |
| [`createBuild(def, opts?)`](#build) | `devframe/adapters/build` | Static deploy |
| [`createMcpServer(def, opts?)`](#mcp) | `devframe/adapters/mcp` | stdio MCP server |
| `parseCliFlags(schema, raw)` | `devframe/adapters/cli` | Validate a flag bag against a `CliFlagsSchema` |

See the [Standalone CLI guide](./standalone-cli#use-your-own-cli-framework) for a worked commander example.

## Dev

The `dev` adapter is the building block `createCli` uses internally — h3 + WebSocket RPC + the author's SPA mounted at the resolved base path. Reach for it directly to mount the dev server inside an existing CLI program (commander, yargs, hand-rolled CAC) or to attach custom middleware to the underlying h3 app.

```ts
import { createDevServer } from 'devframe/adapters/dev'
import devframe from './devframe'

const handle = await createDevServer(devframe, {
  port: 7777,
  onReady: ({ origin }) => console.log(`Ready at ${origin}`),
})

// graceful shutdown — SIGINT, hot reload, test teardown
process.on('SIGINT', () => handle.close().then(() => process.exit(0)))
```

`createDevServer` returns the underlying `StartedServer` (origin, port, h3 app, WS server, RPC group, `close()`) so callers can integrate it into their own process lifecycle.

| Option | Default | Description |
|--------|---------|-------------|
| `host` | `def.cli?.host ?? 'localhost'` | Bind host. |
| `port` | resolved via `resolveDevServerPort` | Port to listen on. |
| `flags` | `{}` | Parsed flag bag forwarded to `setup(ctx, { flags })`. |
| `distDir` | `def.cli?.distDir` | Required — throws when neither is set. |
| `basePath` | `resolveBasePath(def, 'standalone')` | Mount path override. |
| `app` | fresh h3 app | Pre-configured h3 app to mount onto (custom middleware, auth, extra static assets). |
| `openBrowser` | resolves from `flags.open` / `def.cli?.open` | Explicit on/off override. `false` disables; a string opens that relative path. |
| `onReady` | — | Callback when the WS server is bound. |

### Port resolution

`resolveDevServerPort(def, opts?)` resolves a port up-front (to print or log it) before the server starts:

```ts
import { resolveDevServerPort } from 'devframe/adapters/dev'

const port = await resolveDevServerPort(devframe, { host: '127.0.0.1' })
// honors def.cli?.port / portRange / random
```

| Option | Default | Description |
|--------|---------|-------------|
| `host` | `def.cli?.host ?? 'localhost'` | Bind host (passed to `get-port-please` for in-use detection). |
| `defaultPort` | `def.cli?.port ?? 9999` | Override the preferred port. |

## Mount paths

A devframe's SPA basePath depends on which adapter is running it:

| Adapter kind | Default basePath | Reason |
|--------------|------------------|--------|
| `cli`, `spa`, `build` (standalone) | `/` | The devframe owns the origin. |
| `vite`, `kit`, `embedded` (hosted) | `/__<id>/` | The devframe shares the origin with a host app and namespaces itself. |

Override either side explicitly with `DevframeDefinition.basePath`:

```ts
defineDevframe({
  id: 'my-devframe',
  basePath: '/devframes/', // force this base regardless of adapter
  setup(ctx) { /* … */ },
})
```

SPA authors should build with relative asset paths (`vite.base: './'`); the client resolves its connection descriptor relative to the page at runtime. See [Client](./client#runtime-basepath-discovery) for the discovery rules.

## Vite

A thin Vite plugin that mounts a devframe's SPA into an existing Vite dev server as a *hosted* adapter — the mount path defaults to `/__<id>/` to namespace away from the app. The plugin mounts the SPA only; for RPC, use `kit` or `cli`.

```ts
import { createVitePlugin } from 'devframe/adapters/vite'
import { defineConfig } from 'vite'
import devframe from './devframe'

export default defineConfig({
  plugins: [createVitePlugin(devframe)],
})
```

| Option | Default | Description |
|--------|---------|-------------|
| `base` | `def.basePath ?? '/__<id>/'` | Mount path inside the Vite dev server. |

Use this adapter when a devframe's UI is purely static and you want to surface it during Vite `serve` without shipping a separate dev server. Set `DevframeDefinition.basePath` on the definition for a custom path that stays consistent across adapters.

## Build

Produces a self-contained static deploy of a devframe:

1. Copies the author's SPA dist (`cli.distDir` or `options.distDir`) into `<outDir>`.
2. Runs `setup(ctx)` with `mode: 'build'`.
3. Collects RPC dumps for every `'static'` function and any `'query'` function with `dump.inputs` / `snapshot: true`.
4. Writes `<outDir>/__connection.json` (`{ backend: 'static' }`) and sharded dump files under `<outDir>/__rpc-dump/` — both at the SPA root so the deployed client discovers them via relative paths from `document.baseURI`.
5. When `def.spa` is set, also writes `<outDir>/spa-loader.json` describing how the SPA hydrates its data.

```ts
import { createBuild } from 'devframe/adapters/build'
import devframe from './devframe'

await createBuild(devframe, {
  outDir: 'dist-static',
  base: '/',
})
```

| Option | Default | Description |
|--------|---------|-------------|
| `outDir` | `dist-static` | Output directory. Cleared on each build. |
| `base` | `/` | Absolute URL base the output is served from. |
| `distDir` | `def.cli?.distDir` | Override the SPA dist directory. |

The resulting directory hosts on any static web server (`serve`, nginx, GitHub Pages, …). The client auto-detects `static` mode by resolving `./__connection.json` against `document.baseURI` and runs in read-only form.

`createBuild` copies the SPA verbatim, so deploying under a custom URL base just means building the SPA with relative asset paths (`vite.base: './'`) — the client discovers the effective base at runtime.

When `def.spa` is set on the definition, `createBuild` also writes `spa-loader.json` next to `index.html` describing how the deployed SPA sources its data:

- `'none'` — use the baked RPC dump only (read-only static view).
- `'query'` — hydrate from URL search params.
- `'upload'` — accept a drag-and-drop file.

Deployed SPAs that use `setupBrowser` ship their own client entry that registers the handlers.

## Kit

Wraps a `DevframeDefinition` so Vite DevTools Kit's plugin-scan picks it up. The factory lives in `@vitejs/devtools-kit/node` — kit owns docking and process management while devframe stays portable.

```ts
import { createPluginFromDevframe } from '@vitejs/devtools-kit/node'
import devframe from './devframe'

export default function myVitePlugin() {
  return createPluginFromDevframe(devframe)
}
```

The returned object has the shape `{ name, devtools: { setup, capabilities } }`. Use this adapter when your devframe should live inside the Vite DevTools dock alongside other integrations. Kit synthesises an iframe dock entry from the definition's `id` / `name` / `icon` / `basePath`; for richer kit-specific behaviour (extra terminals, commands, dock overrides) pass `options.setup`. See the [DevTools Kit → DevTools Plugin](https://devtools.vite.dev/kit/devtools-plugin) page for the Vite-specific guide.

| Option | Default | Description |
|--------|---------|-------------|
| `name` | `devframe:<id>` | Override the Vite plugin name. |
| `base` | `def.basePath ?? /.${id}/` | Mount path override. |
| `dock` | `{}` | Overrides for the synthesized iframe dock entry (category, icon, when). |
| `setup` | — | Additional kit-only setup hook; receives the kit-augmented context. |

## Embedded

Register a devframe into an already-running context at runtime. Mirrors Kit's internal plugin-scan, but for callers that need dynamic, post-startup registration. The host decides the mount path; `embedded` is a hosted adapter and inherits the `/__<id>/` default when one is needed.

```ts
import { createEmbedded } from 'devframe/adapters/embedded'
import devframe from './devframe'

await createEmbedded(devframe, { ctx: existingCtx })
```

| Option | Required | Description |
|--------|----------|-------------|
| `ctx` | ✓ | Target `DevToolsNodeContext` the devframe is registered into. |

Useful when a host loads devframes based on runtime conditions (feature flags, user opt-in, dynamic discovery) rather than static config.

## MCP

> [!WARNING] Experimental
> The agent-native surface is experimental and may change without a major version bump.

Translates a devframe's agent host into a [Model Context Protocol](https://modelcontextprotocol.io) server so coding agents (Claude Desktop, Cursor, Zed, Claude Code) can call flagged RPCs and read exposed resources.

```ts
import { createMcpServer } from 'devframe/adapters/mcp'
import devframe from './devframe'

await createMcpServer(devframe, { transport: 'stdio' })
```

`@modelcontextprotocol/sdk` is a peer dependency — install it when shipping MCP support. The current transport is `stdio`.

See the [Agent-Native](./agent-native) page for the full API, safety model, and Claude Desktop integration example.
