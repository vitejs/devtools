---
outline: deep
---

# Devframe Definition

Every Devframe tool starts with a single `defineDevframe` call. The returned `DevframeDefinition` is a portable value that any of the [adapters](./adapters) can consume — the same definition runs under `createCli`, `createBuild`, `createMcpServer`, kit's `createPluginFromDevframe`, and so on.

## Minimal definition

```ts twoslash
import { defineDevframe, defineRpcFunction } from 'devframe'
import * as v from 'valibot'

export default defineDevframe({
  id: 'my-devframe',
  name: 'My Devframe',
  icon: 'ph:gauge-duotone',
  setup(ctx) {
    // Register your RPC functions, shared state, etc. here.
    ctx.rpc.register(defineRpcFunction({
      name: 'my-devframe:hello',
      type: 'static',
      jsonSerializable: true,
      handler: () => ({ message: 'hello' }),
    }))
  },
})
```

When mounted into Vite DevTools via [`createPluginFromDevframe`](./adapters#kit), the dock entry and iframe mount are derived from `id`, `name`, `icon`, and `basePath` automatically. Hub-level features (`docks`, `terminals`, `messages`, `commands`) live on the kit-augmented context.

## Definition fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | **Required.** Unique, namespaced identifier (kebab-case). Used as a prefix for RPC names, dock IDs, and MCP tool names. |
| `name` | `string` | **Required.** Display name shown in the dock and agent manifests. |
| `icon` | `string \| { light, dark }` | Optional Iconify name or URL; supports light/dark pairs. |
| `version` | `string` | Optional version string surfaced to clients. |
| `basePath` | `string` | Optional mount path override. Defaults depend on the adapter: `/` for standalone (`cli` / `spa` / `build`), `/.<id>/` for hosted (`vite` / `kit` / `embedded`). |
| `capabilities` | `{ dev?, build?, spa? }` | Per-runtime feature flags. A `boolean` applies to the runtime as a whole; an object enables individual features. |
| `setup` | `(ctx, info?) => void \| Promise<void>` | **Required.** Server-side entry point. Runs in every runtime. The optional second argument carries runtime metadata — most notably the parsed CLI `flags` when running under `createCli`. |
| `setupBrowser` | `(ctx) => void \| Promise<void>` | Browser-only entry used by the SPA adapter. |
| `cli` | `DevframeCliOptions` | Defaults for the CLI adapter. See [CLI options](#cli-options) below. |
| `spa` | `DevframeSpaOptions` | Defaults for the SPA adapter (`base`, `loader`). |

### Runtime flags

The `ctx.mode` field is either `'dev'` or `'build'`. Use it to gate work that should only run in one runtime:

```ts
defineDevframe({
  id: 'my-devframe',
  name: 'My Devframe',
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

The CLI dev server sets `mode: 'dev'`; `createBuild` sets `mode: 'build'`.

## The setup context

`setup(ctx)` receives a `DevToolsNodeContext`:

```ts
interface DevToolsNodeContext {
  readonly cwd: string
  readonly workspaceRoot: string
  readonly mode: 'dev' | 'build'

  host: DevToolsHost // runtime abstraction (mountStatic / resolveOrigin / getStorageDir)
  rpc: RpcFunctionsHost // register + broadcast + sharedState
  views: DevToolsViewHost // static file hosting (`hostStatic`)
  diagnostics: DevToolsDiagnosticsHost
  agent: DevToolsAgentHost // experimental
}
```

Hub-level subsystems — `docks`, `terminals`, `messages`, `commands`, `createJsonRenderer` — live on the kit-augmented context owned by `@vitejs/devtools-kit`. A devframe app that wants to register kit-only behavior does so through the optional `setup` hook on `createPluginFromDevframe`.

Each host has a dedicated page:
- [RPC](./rpc) — `ctx.rpc`
- [Shared State](./shared-state) — `ctx.rpc.sharedState`
- [Diagnostics](./diagnostics) — `ctx.diagnostics`
- [Agent-Native](./agent-native) — `ctx.agent`
- Hub-side surfaces — [Dock System](https://devtools.vite.dev/kit/dock-system), [Commands](https://devtools.vite.dev/kit/commands), [Messages](https://devtools.vite.dev/kit/messages), [Terminals](https://devtools.vite.dev/kit/terminals) — live in the [Vite DevTools Kit](https://devtools.vite.dev/kit/) docs.

## Browser setup

The SPA adapter supports a `setupBrowser(ctx)` hook that runs inside the deployed client bundle. Use it for tools that perform their own in-browser work — parsing a dropped file, calling public APIs from the client, etc.

```ts
defineDevframe({
  id: 'my-devframe',
  name: 'My Devframe',
  setup(ctx) { /* server-side */ },
  setupBrowser(ctx) {
    // `ctx.rpc` is the write-disabled static client in SPA mode.
  },
})
```

Deployed SPAs that use `setupBrowser` ship their own client entry that registers the handlers.

## CLI options

`cli` configures the CLI adapter's defaults and plugs additional flags/commands into the CAC instance:

```ts
defineDevframe({
  id: 'my-devframe',
  name: 'My Devframe',
  cli: {
    command: 'my-devframe', // binary name; default: the `id`
    distDir: './client/dist', // required for dev / build / spa
    port: 9876, // preferred port; default: 9999
    portRange: [9876, 10000], // forwarded to get-port-please
    random: false, // forwarded to get-port-please
    host: 'localhost', // default host; --host overrides
    open: true, // auto-open the browser on dev start
    auth: false, // skip the trust handshake (single-user localhost)
    configure(cli) { // contribute capability flags/commands
      cli
        .option('--my-flag <value>', 'Tool-specific flag')
    },
  },
  setup(ctx, { flags }) {
    // `flags` carries the parsed cac bag — contains built-in flags
    // (`--port`, `--host`, `--open`, `--no-open`) and anything you added
    // in `configure`.
  },
})
```

| Field | Type | Description |
|-------|------|-------------|
| `command` | `string` | Binary name surfaced in `--help`. Default: the definition's `id`. |
| `distDir` | `string` | SPA dist directory. **Required** for `dev` / `build` / `spa`. |
| `port` | `number` | Preferred port for the dev server. |
| `portRange` | `[number, number]` | Port scan range, passed through to `get-port-please`. |
| `random` | `boolean` | Prefer a random open port. |
| `host` | `string` | Default bind host. |
| `open` | `boolean \| string` | `true` opens the origin, a string opens a specific path, `false` disables. Matches the `--open` / `--no-open` flags. |
| `auth` | `boolean` | Disable the WS trust flow when the tool is localhost-only and single-user. Default `true`. |
| `configure` | `(cli: CAC) => void` | Contribute capability flags/commands. Runs before `createCli`'s `configureCli` option so the final tool author always has the last word. |

`setup(ctx, info)` receives `info.flags` populated from both devframe's built-in flags and any you declared via `configure` — saves duplicating flag parsing.

## SPA options

```ts
defineDevframe({
  id: 'my-devframe',
  spa: {
    base: '/',
    loader: 'query', // 'query' | 'upload' | 'none'
  },
})
```

See [Adapters](./adapters) for how each adapter consumes these.

## Multiple runtimes, one definition

The definition is a plain value, so wire it into multiple adapters from the same file:

```ts
import { createPluginFromDevframe } from '@vitejs/devtools-kit/node'
import { createBuild } from 'devframe/adapters/build'
import { createCli } from 'devframe/adapters/cli'

const devframe = defineDevframe({ id: 'my-devframe', name: 'My Devframe', setup() {} })

// 1. Standalone CLI:
await createCli(devframe).parse()

// 2. Embedded in a Vite project (from `vite.config.ts`):
export const myPlugin = () => createPluginFromDevframe(devframe)

// 3. Offline snapshot:
await createBuild(devframe, { outDir: 'dist-static' })
```

## What's next

- [Adapters](./adapters) — pick a deployment target
- [RPC](./rpc) — register server functions
- [Vite DevTools Kit](https://devtools.vite.dev/kit/) — mount your devframe into the multi-integration hub
