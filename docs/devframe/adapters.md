---
outline: deep
---

# Adapters

An adapter takes a `DevtoolDefinition` and deploys it into a specific runtime — a standalone CLI, a Vite plugin, a static snapshot, an SPA, a Kit plugin, an embedded host, or an MCP server. Each adapter lives at its own entry point (`devframe/adapters/<name>`), so only the adapters you actually use are pulled into your bundle.

All adapter factories share the same shape: `createXxx(devtoolDef, options?)`.

## Comparison

| Adapter | Entry | Factory | Best for |
|---------|-------|---------|----------|
| [`cli`](#cli) | `devframe/adapters/cli` | `createCli(def, options?)` | Standalone tools run via `node ./my-tool.js` |
| [`vite`](#vite) | `devframe/adapters/vite` | `createVitePlugin(def, options?)` | Mount a tool's UI inside an existing Vite dev server |
| [`build`](#build) | `devframe/adapters/build` | `createBuild(def, options?)` | Offline reports, CI artifacts, baked-in data |
| [`spa`](#spa) | `devframe/adapters/spa` | `createSpa(def, options?)` | Deployable dashboards that load data via URL / upload |
| [`kit`](#kit) | `devframe/adapters/kit` | `createKitPlugin(def, options?)` | Integrating into Vite DevTools Kit |
| [`embedded`](#embedded) | `devframe/adapters/embedded` | `createEmbedded(def, { ctx })` | Runtime registration into an already-running host |
| [`mcp`](#mcp) | `devframe/adapters/mcp` | `createMcpServer(def, options?)` | Exposing a devtool to coding agents |

## CLI

The CLI adapter wraps a `DevtoolDefinition` in a `cac`-powered command-line interface. It spins up an `h3` dev server with WebSocket RPC, builds static snapshots, builds SPA bundles, or starts an MCP server — all from one entry.

```ts
import { defineDevtool } from 'devframe'
import { createCli } from 'devframe/adapters/cli'

const devtool = defineDevtool({
  id: 'my-devtool',
  name: 'My Devtool',
  cli: { distDir: './client/dist' },
  setup(ctx) { /* register docks, RPC, etc. */ },
})

await createCli(devtool).parse()
```

Running the resulting binary:

```sh
my-devtool                     # dev server at http://localhost:9999/
my-devtool --port 8080
my-devtool build --out-dir dist-static
my-devtool spa --out-dir dist-spa --base /devtools/
my-devtool mcp                 # stdio MCP server (experimental)
```

> Standalone CLI serves the SPA at `/` by default — no `/.devtools/` prefix. That prefix is reserved for *hosted* adapters where devframe mounts alongside an existing app. See [Mount paths](#mount-paths) below.

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

The `cli` property lets the caller add ad-hoc commands and flags right before `parse()` for cases where a `configureCli` callback is inconvenient.

### Definition-level `cli` fields

```ts
defineDevtool({
  id: 'my-devtool',
  cli: {
    command: 'my-devtool', // binary name; default: the id
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

Devframe deliberately does not print a startup banner of its own. Wire `onReady` if you want one:

```ts
await createCli(devtool, {
  onReady({ origin }) {
    console.log(`ESLint Config Inspector ready at ${origin}`)
  },
}).parse()
```

Structured diagnostics (via `logs-sdk`) continue to surface through their normal reporters.

## Mount paths

The basePath where a devtool's SPA is mounted depends on the adapter it's running under:

| Adapter kind | Default basePath | Reason |
|--------------|------------------|--------|
| `cli`, `spa`, `build` (standalone) | `/` | The devtool is the only thing on the origin. |
| `vite`, `kit`, `embedded` (hosted) | `/.<id>/` | The devtool shares the origin with a host app and must namespace itself. |

Override either side explicitly with `DevtoolDefinition.basePath`:

```ts
defineDevtool({
  id: 'my-devtool',
  basePath: '/devtools/', // force this base regardless of adapter
  setup(ctx) { /* … */ },
})
```

SPA authors should **build with relative asset paths** (`vite.base: './'`) rather than baking an absolute base into the output; the client resolves its connection descriptor relative to the page at runtime. See the [Client](./client#runtime-basepath-discovery) page for the discovery rules.

## Vite

A thin Vite plugin that mounts a devtool's SPA into an existing Vite dev server as a *hosted* adapter — the mount path defaults to `/.<id>/` to avoid colliding with the app. It **does not** start an RPC WebSocket server — use `kit` or `cli` when you need RPC.

```ts
import { createVitePlugin } from 'devframe/adapters/vite'
import { defineConfig } from 'vite'
import devtool from './devtool'

export default defineConfig({
  plugins: [createVitePlugin(devtool)],
})
```

| Option | Default | Description |
|--------|---------|-------------|
| `base` | `def.basePath ?? '/.<id>/'` | Mount path inside the Vite dev server. |

Use this adapter when a devtool's UI is purely static (no server calls) and you want to surface it during Vite `serve` without shipping a separate dev server. Set `DevtoolDefinition.basePath` on the definition if you want a custom path that stays consistent across adapters.

## Build

Produces a static snapshot of a devtool:

1. Runs `setup(ctx)` with `mode: 'build'`.
2. Collects RPC dumps for every `'static'` function.
3. Writes `.connection.json` (backend: `static`) and sharded dump files under `<outDir>/.devtools/`.
4. Copies the author's SPA dist (`cli.distDir` or `options.distDir`) into `<outDir>`.

```ts
import { createBuild } from 'devframe/adapters/build'
import devtool from './devtool'

await createBuild(devtool, {
  outDir: 'dist-static',
  base: '/',
})
```

| Option | Default | Description |
|--------|---------|-------------|
| `outDir` | `dist-static` | Output directory. Cleared on each build. |
| `base` | `/` | Absolute URL base the output is served from. |
| `distDir` | `def.cli?.distDir` | Override the SPA dist directory. |

The resulting directory can be hosted by any static web server. The client auto-detects `static` mode via `.devtools/.connection.json` and runs in read-only form.

> [!TIP]
> `createBuild` copies the SPA verbatim. To deploy under a custom URL base, build your SPA with relative asset paths (`vite.base: './'`) — the client discovers the effective base at runtime. No HTML rewriting is performed at build time.

## SPA

Layers on top of `createBuild` to produce a deployable SPA bundle. Adds a `spa-loader.json` descriptor so the deployed client knows how to source its data.

```ts
import { createSpa } from 'devframe/adapters/spa'
import devtool from './devtool'

await createSpa(devtool, { outDir: 'dist-spa', base: '/' })
```

| Option | Default | Description |
|--------|---------|-------------|
| `outDir` | `dist-spa` | Output directory. |
| `base` | `/` | URL base. |

The `spa.loader` on the definition controls the loader descriptor:

- `'none'` — use the baked RPC dump only (read-only static view).
- `'query'` — hydrate from URL search params.
- `'upload'` — accept a drag-and-drop file.

> [!NOTE]
> `setupBrowser` bundling is not yet automated. Deployed SPAs that rely on it must ship their own client entry. `createSpa` warns at build time when this applies.

## Kit

Wraps a `DevtoolDefinition` so that Vite DevTools Kit's plugin-scan picks it up.

```ts
import type { Plugin } from 'vite'
import { createKitPlugin } from 'devframe/adapters/kit'
import devtool from './devtool'

export default function myVitePlugin(): Plugin {
  return createKitPlugin(devtool) as unknown as Plugin
}
```

The returned object has the shape `{ name, devtools: { setup, capabilities } }`. Use this adapter when your devtool should live inside the Vite DevTools dock alongside other integrations. For a Vite-specific plugin guide, see the [DevTools Kit → DevTools Plugin](/kit/devtools-plugin) page.

| Option | Default | Description |
|--------|---------|-------------|
| `name` | `devframe:<id>` | Override the Vite plugin name. |

## Embedded

Register a devtool into an already-running context at runtime. Mirrors the internal plugin-scan that Kit runs at startup, but exposes it for callers that need dynamic, post-startup registration. The host decides the mount path; `embedded` is treated as a hosted adapter and inherits the `/.<id>/` default when one is needed.

```ts
import { createEmbedded } from 'devframe/adapters/embedded'
import devtool from './devtool'

await createEmbedded(devtool, { ctx: existingCtx })
```

| Option | Required | Description |
|--------|----------|-------------|
| `ctx` | ✓ | Target `DevToolsNodeContext` the devtool is registered into. |

Useful when a host wants to load devtools based on runtime conditions (feature flags, user opt-in, dynamic discovery) rather than static config.

## MCP

> [!WARNING] Experimental
> The agent-native surface is experimental and may change without a major version bump.

Translates a devtool's agent host into a [Model Context Protocol](https://modelcontextprotocol.io) server so coding agents (Claude Desktop, Cursor, Zed, Claude Code) can call flagged RPCs and read exposed resources.

```ts
import { createMcpServer } from 'devframe/adapters/mcp'
import devtool from './devtool'

await createMcpServer(devtool, { transport: 'stdio' })
```

`@modelcontextprotocol/sdk` is a peer dependency — install it when shipping MCP support. Today only `stdio` transport is implemented; HTTP / streamable transports are planned.

See the [Agent-Native](./agent-native) page for the full API, safety model, and Claude Desktop integration example.
