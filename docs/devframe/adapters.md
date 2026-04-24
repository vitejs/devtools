---
outline: deep
---

# Adapters

An adapter takes a `DevtoolDefinition` and deploys it into a specific runtime — a standalone CLI, a Vite plugin, a static snapshot, an SPA, a Kit plugin, an embedded host, or an MCP server. Each adapter lives at its own entry point (`devframe/adapters/<name>`), so only the adapters you actually use are pulled into your bundle.

## Comparison

| Adapter | Entry | Mode | RPC Transport | Best for |
|---------|-------|------|---------------|----------|
| [`cli`](#cli) | `devframe/adapters/cli` | `dev` / `build` / `spa` / `mcp` | WebSocket (dev) / static (build) | Standalone tools run via `node ./my-tool.js` |
| [`vite`](#vite) | `devframe/adapters/vite` | `dev` (Vite `serve`) | None (SPA only) | Mount a tool's UI inside an existing Vite dev server |
| [`build`](#build) | `devframe/adapters/build` | `build` | Static snapshot | Offline reports, CI artifacts, baked-in data |
| [`spa`](#spa) | `devframe/adapters/spa` | `build` | Static snapshot | Deployable dashboards that load data via URL / upload |
| [`kit`](#kit) | `devframe/adapters/kit` | `dev` / `build` | Handled by Kit | Integrating into Vite DevTools Kit |
| [`embedded`](#embedded) | `devframe/adapters/embedded` | Inherited | Inherited | Runtime registration into an already-running host |
| [`mcp`](#mcp) | `devframe/adapters/mcp` | `dev` | stdio MCP | Exposing a devtool to coding agents |

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
my-devtool                     # dev server at http://localhost:9999/.devtools/
my-devtool --port 8080
my-devtool build --out-dir dist-static
my-devtool spa --out-dir dist-spa --base /devtools/
my-devtool mcp                 # stdio MCP server (experimental)
```

### Options

`createCli(definition, options?)` accepts:

| Option | Default | Description |
|--------|---------|-------------|
| `defaultPort` | `9999` (or `definition.cli?.port`) | Port used by the dev command when `--port` isn't provided. |

Definition-level `cli` fields (`command`, `port`, `open`, `distDir`) supply defaults — `distDir` is required for `dev` / `build` / `spa`.

## Vite

A thin Vite plugin that mounts a devtool's SPA into an existing Vite dev server at `options.base` (default `/__devframe/<id>/`). It **does not** start an RPC WebSocket server — use `kit` or `cli` when you need RPC.

```ts
import { devframeVite } from 'devframe/adapters/vite'
import { defineConfig } from 'vite'
import devtool from './devtool'

export default defineConfig({
  plugins: [devframeVite(devtool)],
})
```

| Option | Default | Description |
|--------|---------|-------------|
| `base` | `/__devframe/<id>/` | Mount path inside the Vite dev server. |

Use this adapter when a devtool's UI is purely static (no server calls) and you want to surface it during Vite `serve` without shipping a separate dev server.

## Build

Produces a static snapshot of a devtool:

1. Runs `setup(ctx)` with `mode: 'build'`.
2. Collects RPC dumps for every `'static'` function.
3. Writes `.connection.json` (backend: `static`) and sharded dump files under `<outDir>/.devtools/`.
4. Copies the author's SPA dist (`cli.distDir` or `options.distDir`) into `<outDir>`.

```ts
import { buildStatic } from 'devframe/adapters/build'
import devtool from './devtool'

await buildStatic(devtool, {
  outDir: 'dist-static',
  base: '/',
})
```

| Option | Required | Description |
|--------|----------|-------------|
| `outDir` | ✓ | Output directory. Cleared on each build. |
| `base` | | Absolute URL base the output is served from. Default `/`. |
| `distDir` | | Override the SPA dist directory. Defaults to `definition.cli?.distDir`. |

The resulting directory can be hosted by any static web server. The client auto-detects `static` mode via `.devtools/.connection.json` and runs in read-only form.

## SPA

Layers on top of `buildStatic` to produce a deployable SPA bundle. Adds a `spa-loader.json` descriptor so the deployed client knows how to source its data.

```ts
import { buildSpa } from 'devframe/adapters/spa'
import devtool from './devtool'

await buildSpa(devtool, { outDir: 'dist-spa', base: '/' })
```

| Option | Required | Description |
|--------|----------|-------------|
| `outDir` | ✓ | Output directory. |
| `base` | | URL base. Default `/`. |

The `spa.loader` on the definition controls the loader descriptor:

- `'none'` — use the baked RPC dump only (read-only static view).
- `'query'` — hydrate from URL search params.
- `'upload'` — accept a drag-and-drop file.

> [!NOTE]
> `setupBrowser` bundling is not yet automated. Deployed SPAs that rely on it must ship their own client entry. `buildSpa` warns at build time when this applies.

## Kit

Wraps a `DevtoolDefinition` so that Vite DevTools Kit's plugin-scan picks it up.

```ts
import type { Plugin } from 'vite'
import { toKitPlugin } from 'devframe/adapters/kit'
import devtool from './devtool'

export default function myVitePlugin(): Plugin {
  return toKitPlugin(devtool) as unknown as Plugin
}
```

The returned object has the shape `{ name, devtools: { setup, capabilities } }`. Kit re-exports this helper as `toVitePlugin` for ecosystem parity — both names produce identical output.

Use this adapter when your devtool should live inside the Vite DevTools dock alongside other integrations. For a Vite-specific plugin guide, see the [DevTools Kit → DevTools Plugin](/kit/devtools-plugin) page.

## Embedded

Register a devtool into an already-running context at runtime. Mirrors the internal plugin-scan that Kit runs at startup, but exposes it for callers that need dynamic, post-startup registration.

```ts
import { registerInHost } from 'devframe/adapters/embedded'
import devtool from './devtool'

await registerInHost(devtool, existingCtx)
```

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
