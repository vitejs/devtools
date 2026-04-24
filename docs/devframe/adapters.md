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
my-devtool                     # dev server at http://localhost:9999/.devtools/
my-devtool --port 8080
my-devtool build --out-dir dist-static
my-devtool spa --out-dir dist-spa --base /devtools/
my-devtool mcp                 # stdio MCP server (experimental)
```

### Options

`createCli(def, options?)` accepts:

| Option | Default | Description |
|--------|---------|-------------|
| `defaultPort` | `9999` (or `def.cli?.port`) | Port used by the dev command when `--port` isn't provided. |

Definition-level `cli` fields (`command`, `port`, `open`, `distDir`) supply defaults — `distDir` is required for `dev` / `build` / `spa`.

## Vite

A thin Vite plugin that mounts a devtool's SPA into an existing Vite dev server at `options.base` (default `/__devframe/<id>/`). It **does not** start an RPC WebSocket server — use `kit` or `cli` when you need RPC.

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
| `base` | `/__devframe/<id>/` | Mount path inside the Vite dev server. |

Use this adapter when a devtool's UI is purely static (no server calls) and you want to surface it during Vite `serve` without shipping a separate dev server.

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

Register a devtool into an already-running context at runtime. Mirrors the internal plugin-scan that Kit runs at startup, but exposes it for callers that need dynamic, post-startup registration.

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
