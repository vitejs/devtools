---
outline: deep
---

# DevFrame

**DevFrame** is *the container for one devtool integration, portable across viewers.* You describe a single tool — its RPC surface, its data model, its SPA, its CLI shape — and DevFrame deploys the same definition through any number of runtime adapters: a standalone CLI, a self-contained static report, an embedded SPA, an MCP server, or mounted inside a multi-integration hub.

DevFrame deliberately stops at the boundary of one tool. **Docking, the command palette, terminal aggregation, cross-tool toasts** — anything that only makes sense when *multiple* devtools share a UI — lives in [`@vitejs/devtools-kit`](https://devtools.vite.dev/kit/), the hub layer. To drop a DevFrame app into Vite DevTools, wrap it with `createPluginFromDevframe` from `@vitejs/devtools-kit/node`; the kit synthesizes the dock entry from your definition's `id` / `name` / `icon` / `basePath` and routes its hub-level ctx fields (`docks`, `terminals`, …) accordingly.

> [!WARNING] Experimental
> The DevFrame API is still in development and may change between versions. The agent-native surface (`agent` field on `defineRpcFunction`, `ctx.agent`, and the MCP adapter) is additionally flagged as experimental.

## Design Principles

DevFrame keeps its surface small and pushes hub-level UX to the kit consuming it:

- **Single-integration scope.** DevFrame describes one tool. Anything that only matters across tools — docks, palette, cross-tool toasts, unified terminals — is the [DevTools Kit's](https://devtools.vite.dev/kit/) job, not DevFrame's.
- **Headless.** No default startup banners, logging, or styling. Hook into `onReady`, `cli.configure`, and friends to print your own output.
- **App-owned file watching.** Wire your own watcher (chokidar, fs.watch, …) and signal change via `ctx.rpc.sharedState.set(...)` or event-type RPCs. DevFrame does not ship a watcher primitive.
- **Context-aware mount paths.** Standalone adapters (`cli`, `spa`, `build`) serve at `/` by default; hosted adapters (`vite`, `embedded`, kit's `createPluginFromDevframe`) serve at `/.<id>/`. Override via `DevtoolDefinition.basePath`.
- **SPAs own their base at runtime.** Build with relative asset paths (`vite.base: './'`); `connectDevtool` discovers the effective base from the executing script's location. No HTML rewrites at build time.
- **CLI flags compose.** The `cac` instance is exposed to both the devtool (`cli.configure`) and the caller of `createCli`, so capability flags and app flags merge cleanly.

## What DevFrame Provides

| Subsystem | What it does |
|-----------|--------------|
| **[Devtool Definition](./devtool-definition)** | One `defineDevtool` call describes your tool once; the adapters deploy it anywhere. |
| **[RPC](./rpc)** | Type-safe bidirectional calls built on birpc + valibot. Supports `query`, `static`, `action`, and `event` types. |
| **[Shared State](./shared-state)** | Observable, patch-synced state that survives reconnects and bridges server ↔ browser. |
| **[Diagnostics](./diagnostics)** | Coded warnings/errors via `logs-sdk` — registered into the host logger so adapters and consumers share the same surface. |
| **[Streaming](./streaming)** | One-way (RPC streaming) and two-way (uploads) channel primitives for long-running data. |
| **[When Clauses](./when-clauses)** | VS Code-style conditional expressions for docks, commands, and custom UI. |
| **[Client](./client)** | Browser-side RPC client (`connectDevtool`) with auto-auth and WebSocket / static modes. |
| **[Agent-Native](./agent-native)** | Opt-in exposure of your tool's surface to coding agents over MCP. |

> Hub-only subsystems — **[Dock System](https://devtools.vite.dev/kit/dock-system)**, **[Commands](https://devtools.vite.dev/kit/commands)**, **[Messages](https://devtools.vite.dev/kit/messages)**, **[Terminals](https://devtools.vite.dev/kit/terminals)** — are documented in the [Vite DevTools Kit](https://devtools.vite.dev/kit/) since they only matter when multiple integrations share a UI.

## Architecture

```mermaid
flowchart TB
  Definition["DevtoolDefinition<br/>(defineDevtool)"]
  Definition --> Adapters

  subgraph Adapters["Adapters (choose one per deployment)"]
    CLI["cli"]
    Vite["vite"]
    Build["build"]
    SPA["spa"]
    Kit["kit"]
    Embedded["embedded"]
    MCP["mcp"]
  end

  Adapters --> Ctx["DevToolsNodeContext"]

  subgraph Ctx["DevToolsNodeContext (devframe / single-integration)"]
    direction TB
    RPC["rpc"]
    Views["views (hostStatic)"]
    Diagnostics["diagnostics"]
    Agent["agent"]
  end

  Ctx -.->|kit augments<br/>via createKitContext| Hub["KitNodeContext<br/>+ docks · terminals · messages · commands"]
  Ctx <-->|WebSocket or static| Client["DevToolsRpcClient<br/>(browser)"]
```

## Install

```sh
pnpm add devframe
```

`devframe` ships ESM-only and has no Vite dependency. Adapters that need optional peers (MCP needs `@modelcontextprotocol/sdk`) surface that requirement at import time.

## Hello, DevFrame

A minimal devtool with a CLI entry point:

```ts twoslash
import { defineDevtool, defineRpcFunction } from 'devframe'
import { createCli } from 'devframe/adapters/cli'

const devtool = defineDevtool({
  id: 'my-devtool',
  name: 'My Devtool',
  icon: 'ph:gauge-duotone',
  cli: {
    distDir: 'client/dist',
  },
  setup(ctx) {
    ctx.rpc.register(defineRpcFunction({
      name: 'my-devtool:hello',
      type: 'static',
      jsonSerializable: true,
      handler: () => ({ message: 'hello' }),
    }))
  },
})

await createCli(devtool).parse()
```

Drop the same definition into Vite DevTools — the kit auto-derives the iframe dock entry from `id` / `name` / `icon` / `basePath`:

```ts
// vite.config.ts
import { createPluginFromDevframe } from '@vitejs/devtools-kit/node'
import devtool from './my-devtool'

export default {
  plugins: [createPluginFromDevframe(devtool)],
}
```

Run it:

```sh
node ./my-devtool.js        # dev server on http://localhost:9999/
node ./my-devtool.js build  # self-contained static deploy in dist-static/
node ./my-devtool.js mcp    # stdio MCP server (experimental)
```

The CLI adapter serves the SPA at `/` by default. When the same devtool is embedded inside a host (`vite`, `kit`, `embedded`), the default becomes `/.my-devtool/`. Override either side via `defineDevtool({ basePath })`.

## Adapters at a Glance

DevFrame deploys the same `DevtoolDefinition` through one of these adapters:

| Adapter | Entry | Target |
|---------|-------|--------|
| `cli` | `createCli(d).parse()` | Standalone CLI with dev / build / mcp subcommands |
| `vite` | `createVitePlugin(d, opts?)` | Plain Vite plugin — mounts the SPA only (no RPC server, no hub) |
| `build` | `createBuild(d, opts?)` | Self-contained static deploy with baked RPC dumps |
| **kit (bridge)** | `createPluginFromDevframe(d, opts?)` *(from `@vitejs/devtools-kit/node`)* | Mount the devtool into Vite DevTools' hub UI |
| `embedded` | `createEmbedded(d, { ctx })` | Runtime registration into an existing host |
| `mcp` | `createMcpServer(d, opts)` | Model Context Protocol server |

`createPluginFromDevframe` lives in the kit, not in DevFrame, because mounting *into a multi-integration hub* is by definition a kit responsibility. See [Adapters](./adapters) for the full reference.

## Dependency Boundary

DevFrame is the lowest-level package in the Vite DevTools monorepo and is positioned to be extracted into its own repo. It **must not** import from Vite or any `@vitejs/*` package — neither as a dependency nor as a source import. Hub-only concepts (docks, terminals, messages, commands) belong in the layers above:

- `@vitejs/devtools-kit` — *the hub*. Owns docking, terminals, messages, the command palette; provides `createPluginFromDevframe` to bridge a DevFrame app into Vite DevTools.
- `@vitejs/devtools` — *the integration*. The Vite plugin that wraps the kit and exposes Vite DevTools' own UI.

If you are porting an existing inspector, prefer the [`cli`](./adapters#cli) adapter for standalone use and `createPluginFromDevframe` (from `@vitejs/devtools-kit/node`) to surface it inside Vite DevTools.

## What's Next

- [Devtool Definition](./devtool-definition) — understand `defineDevtool` and the `DevToolsNodeContext`
- [Adapters](./adapters) — pick the right deployment target for your tool
- [RPC](./rpc) — define type-safe server functions your client can call
- [Agent-Native](./agent-native) — expose your devtool to Claude Desktop, Cursor, or any MCP client
