---
outline: deep
---

# Devtool Definition

Every DevFrame tool starts with a single `defineDevtool` call. The returned `DevtoolDefinition` is a portable value that any of the seven [adapters](./adapters) can consume — the same definition runs under `createCli`, `createKitPlugin`, `createBuild`, `createMcpServer`, and so on.

## Minimal Definition

```ts twoslash
import { defineDevtool } from 'devframe'

export default defineDevtool({
  id: 'my-devtool',
  name: 'My Devtool',
  setup(ctx) {
    // Register RPC, docks, commands, logs, terminals, agents here.
    ctx.docks.register({
      id: 'my-devtool:main',
      title: 'My Devtool',
      icon: 'ph:gauge-duotone',
      type: 'iframe',
      url: '/.devtools/',
    })
  },
})
```

## Definition Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | **Required.** Unique, namespaced identifier (kebab-case). Used as a prefix for RPC names, dock IDs, and MCP tool names. |
| `name` | `string` | **Required.** Display name shown in the dock and agent manifests. |
| `icon` | `string \| { light, dark }` | Optional Iconify name or URL; supports light/dark pairs. |
| `version` | `string` | Optional version string surfaced to clients. |
| `capabilities` | `{ dev?, build?, spa? }` | Per-runtime feature flags. A `boolean` applies to the runtime as a whole; an object enables individual features. |
| `setup` | `(ctx) => void \| Promise<void>` | **Required.** Server-side entry point. Runs in every runtime. |
| `setupBrowser` | `(ctx) => void \| Promise<void>` | Browser-only entry used by the SPA adapter. |
| `cli` | `DevtoolCliOptions` | Defaults for the CLI adapter (`command`, `port`, `open`, `distDir`). |
| `spa` | `DevtoolSpaOptions` | Defaults for the SPA adapter (`base`, `loader`). |

### Runtime Flags

The `ctx.mode` field is either `'dev'` or `'build'`. Use it to gate work that should only run in one runtime:

```ts
defineDevtool({
  id: 'my-devtool',
  name: 'My Devtool',
  setup(ctx) {
    if (ctx.mode === 'build') {
      // Static-only work — baked into the RPC dump.
    }
    else {
      // Dev-mode wiring, file watchers, etc.
    }
  },
})
```

The CLI dev server sets `mode: 'dev'`; `createBuild` / `createSpa` set `mode: 'build'`.

## The Setup Context

`setup(ctx)` receives a `DevToolsNodeContext`:

```ts
interface DevToolsNodeContext {
  readonly cwd: string
  readonly workspaceRoot: string
  readonly mode: 'dev' | 'build'

  host: DevToolsHost // runtime abstraction (mountStatic / resolveOrigin)
  rpc: RpcFunctionsHost // register + broadcast + sharedState
  docks: DevToolsDockHost // dock entries
  views: DevToolsViewHost // static file hosting
  terminals: DevToolsTerminalHost
  logs: DevToolsLogsHost
  commands: DevToolsCommandsHost
  agent: DevToolsAgentHost // experimental

  createJsonRenderer: (spec) => JsonRenderer
  utils: DevToolsNodeUtils
}
```

Each host has a dedicated page:
- [RPC](./rpc) — `ctx.rpc`
- [Shared State](./shared-state) — `ctx.rpc.sharedState`
- [Dock System](./dock-system) — `ctx.docks`, `ctx.views`
- [Commands](./commands) — `ctx.commands`
- [Logs](./logs) — `ctx.logs`
- [Terminals](./terminals) — `ctx.terminals`
- [Agent-Native](./agent-native) — `ctx.agent`

## Browser Setup

The SPA adapter supports a `setupBrowser(ctx)` hook that runs inside the deployed client bundle. Use it for tools that perform their own in-browser work rather than fetching from a server (e.g. parsing a dropped file, calling public APIs from the client).

```ts
defineDevtool({
  id: 'my-devtool',
  name: 'My Devtool',
  setup(ctx) { /* server-side */ },
  setupBrowser(ctx) {
    // `ctx.rpc` is the write-disabled static client in SPA mode.
  },
})
```

> [!NOTE]
> Automatic bundling of `setupBrowser` into the SPA output is not yet implemented. Until then, deployed SPAs that use it must ship their own client entry that registers the handlers. `createSpa` prints a warning when this applies.

## CLI & SPA Options

`cli` and `spa` let you set defaults that adapters pick up automatically:

```ts
defineDevtool({
  id: 'my-devtool',
  name: 'My Devtool',
  cli: {
    command: 'my-devtool', // default: the `id`
    port: 9876, // default: 9999
    open: true, // open the browser on start
    distDir: './client/dist', // author's SPA dist — required for dev / build / spa
  },
  spa: {
    base: '/',
    loader: 'query', // 'query' | 'upload' | 'none'
  },
  setup() { /* ... */ },
})
```

See [Adapters](./adapters) for how each adapter consumes these.

## Multiple Runtimes, One Definition

Because the definition is a plain value, you can wire it into multiple adapters from the same file:

```ts
import { createBuild } from 'devframe/adapters/build'
import { createCli } from 'devframe/adapters/cli'
import { createKitPlugin } from 'devframe/adapters/kit'

const devtool = defineDevtool({ id: 'my-devtool', name: 'My Devtool', setup() {} })

// 1. Standalone CLI:
await createCli(devtool).parse()

// 2. Embedded in a Vite project (from `vite.config.ts`):
export const myPlugin = () => createKitPlugin(devtool)

// 3. Offline snapshot:
await createBuild(devtool, { outDir: 'dist-static' })
```

## What's Next

- [Adapters](./adapters) — pick a deployment target
- [RPC](./rpc) — register server functions
- [Dock System](./dock-system) — add UI surfaces
