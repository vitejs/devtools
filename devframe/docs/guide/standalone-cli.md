---
outline: deep
---

# Standalone CLI with Devframe

This recipe walks through building a standalone CLI devframe on top of Devframe — the shape where a user runs `npx my-tool` and gets a local dev server serving a Vue / Nuxt / React SPA backed by type-safe RPC, plus `build` / `spa` / `mcp` subcommands for free.

It's the pattern used by tools like an ESLint config inspector or a bundler-config viewer: a binary that opens a browser.

## What you ship

```
my-tool/
├── bin.mjs                  # shebang + import './dist/cli.mjs'
├── src/
│   ├── cli.ts               # defineDevframe + createCli
│   ├── rpc.ts               # your RPC function definitions
│   └── data.ts              # your domain-specific logic
├── app/                     # Nuxt / Vue / React SPA source
├── dist/
│   ├── public/              # built SPA output (served at /)
│   └── cli.mjs              # bundled node entry
└── package.json
```

## Minimal CLI

```ts [src/cli.ts]
import process from 'node:process'
import { defineDevframe, defineRpcFunction } from 'devframe'
import { createCli } from 'devframe/adapters/cli'
import { colors as c } from 'devframe/utils/colors'
import { resolve } from 'pathe'

const distDir = resolve(import.meta.dirname, '../dist/public')

const devframe = defineDevframe({
  id: 'my-tool',
  name: 'My Tool',
  cli: {
    command: 'my-tool',
    distDir,
    port: 7777,
    portRange: [7777, 9000],
    open: true,
    auth: false, // single-user localhost — skip the trust handshake
    configure(cli) {
      cli
        .option('--config <file>', 'Config file path')
        .option('--base-path <dir>', 'Base directory for resolution')
    },
  },
  async setup(ctx, { flags }) {
    ctx.rpc.register(defineRpcFunction({
      name: 'my-tool:get-payload',
      type: 'query',
      async handler() {
        return await loadPayload({
          configPath: flags.config,
          basePath: flags.basePath,
        })
      },
    }))
  },
})

await createCli(devframe, {
  onReady({ origin }) {
    console.log(c.green`My Tool ready at ${origin}`)
  },
}).parse(process.argv)
```

Run:

```sh
my-tool                                     # dev server at http://localhost:7777/
my-tool --config ./my.config.mjs
my-tool --port 8080 --no-open
my-tool build --out-dir dist-static         # self-contained static deploy
my-tool build --out-dir dist-static --base /tool/  # …under a custom base
my-tool mcp                                 # agent exposure (experimental)
```

## Nuxt SPA setup

For the Nuxt side, add the devframe helper module — it sets `app.baseURL: './'` / `vite.base: './'`, injects a client plugin that wires `connectDevframe()` into `useNuxtApp().$rpc`, and exposes the typed RPC client to the whole app:

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  ssr: false,
  modules: ['@devframes/nuxt'],
  nitro: {
    preset: 'static',
    output: { dir: './dist' }, // matches createCli's distDir of ./dist/public
  },
})
```

Build with `nuxt build` and point `cli.distDir` at `./dist/public`. The SPA discovers its effective base at runtime — no `--base` rewrite needed. See the [Nuxt helper docs](./nuxt) for the full reference.

## Connecting from the client

With the Nuxt helper installed, use `$rpc` directly:

```ts [app/composables/payload.ts]
export async function fetchPayload() {
  const { $rpc } = useNuxtApp()
  return $rpc.call('my-tool:get-payload')
}
```

For non-Nuxt frontends (Vite + Vue, React, plain HTML, etc.), call `connectDevframe()` yourself:

```ts
import { connectDevframe } from 'devframe/client'

const rpc = await connectDevframe()
const payload = await rpc.call('my-tool:get-payload')
```

`connectDevframe` auto-resolves the connection descriptor relative to the current page — it works both in dev (WebSocket backend) and in the built static snapshot (`static` backend reads the baked RPC dump).

## Typed CLI flags

For flags that are specific to your tool, declare them as valibot schemas so they're validated at parse time and typed at the call site:

```ts
import type { InferCliFlags } from 'devframe/adapters/cli'
import { defineDevframe } from 'devframe'
import { defineCliFlags } from 'devframe/adapters/cli'
import * as v from 'valibot'

const appFlags = defineCliFlags({
  depth: v.pipe(v.number(), v.integer()),
  config: v.optional(v.string()),
  verbose: v.optional(v.boolean()),
})

defineDevframe({
  id: 'my-tool',
  name: 'My Tool',
  cli: {
    distDir,
    flags: appFlags,
  },
  setup(ctx, info) {
    const flags = info.flags as InferCliFlags<typeof appFlags>
    flags.depth // number
    flags.config // string | undefined
  },
})
```

The adapter derives each flag's CAC option from its schema — booleans become `--verbose` / `--no-verbose`; everything else becomes `--depth <value>`. Keys are camelCase in TypeScript, kebab-case on the command line (`configFile` → `--config-file`). Flags that aren't in your schema (`--host`, `--port`, or anything added via `cli.configure`) still pass through untouched.

## Open helpers

For the two actions every CLI devtool needs — open a file in the editor, reveal a path in the OS file explorer — use the prebuilt recipes instead of re-implementing them:

```ts
import { openHelpers } from 'devframe/recipes/open-helpers'

defineDevframe({
  id: 'my-tool',
  name: 'My Tool',
  setup(ctx) {
    openHelpers.forEach(fn => ctx.rpc.register(fn))
  },
})
```

This registers `devframe:open-in-editor` and `devframe:open-in-finder`. Both helpers reuse the bundled [`launchEditor`](./utilities#devframe-utils-launch-editor) and [`open`](./utilities#devframe-utils-open) utilities, so there's nothing extra to install.

## Snapshot queries for static builds

When an RPC function's single job is to return one payload per build (no arguments that vary), set `snapshot: true` so the build adapter runs the handler once and bakes the result into the dump:

```ts
defineRpcFunction({
  name: 'my-tool:get-payload',
  type: 'query',
  snapshot: true,
  handler() {
    return scanPackages(flags.root)
  },
})
```

At build time the handler runs once with no arguments; the result is stored as both the no-args record and the fallback, so `rpc.call('my-tool:get-payload', anything)` from the deployed SPA resolves to the same snapshot. In dev mode the function behaves as a normal `query` over WebSocket — call variants with different args invoke the live handler.

## On-disk caching

Persistence between runs is the application's job — [`unstorage`](https://unstorage.unjs.io/) is the recommended pattern. Keep cache paths under `node_modules/.cache/<your-devtool-id>/` so the cache rotates with the project's `pnpm install`:

```ts
import { resolve } from 'pathe'
import { createStorage } from 'unstorage'
import fsDriver from 'unstorage/drivers/fs'

const cache = createStorage({
  driver: fsDriver({
    base: resolve(process.cwd(), 'node_modules/.cache/my-tool'),
  }),
})

defineDevframe({
  id: 'my-tool',
  name: 'My Tool',
  async setup(ctx) {
    ctx.rpc.register(defineRpcFunction({
      name: 'my-tool:get-npm-meta',
      type: 'query',
      async handler(spec: string) {
        return (await cache.getItem(spec))
          ?? await fetchAndCache(spec, cache)
      },
    }))
  },
})
```

## Live-reload on config changes

Filesystem watching belongs to the application layer — wire your own chokidar and signal the client via shared state:

```ts [src/cli.ts]
defineDevframe({
  id: 'my-tool',
  name: 'My Tool',
  async setup(ctx, { flags }) {
    const payload = defineRpcFunction({
      name: 'my-tool:get-payload',
      type: 'query',
      cacheable: true,
      handler: () => loadPayload({ configPath: flags.config }),
    })
    ctx.rpc.register(payload)

    if (ctx.mode === 'dev') {
      const { default: chokidar } = await import('chokidar')
      const watcher = chokidar.watch(flags.config ?? [], { ignoreInitial: true })
      watcher.on('change', () => {
        ctx.rpc.sharedState.set('my-tool:version', Date.now())
      })
    }
  },
})
```

On the client, subscribe to the version key and refetch:

```ts
const state = await rpc.sharedState.get('my-tool:version')
state.on('updated', () => fetchPayload().then(setData))
```

## Use your own CLI framework

`createCli` is a convenience wrapper around three lower-level factories — reach for them directly when you already own a CLI framework (commander, yargs, oclif, hand-rolled cac) or want a different command structure:

| Building block | Entry |
|----------------|-------|
| `createDevServer(def, opts?)` | `devframe/adapters/dev` |
| `createBuild(def, opts?)`     | `devframe/adapters/build` |
| `createMcpServer(def, opts?)` | `devframe/adapters/mcp` |

Each one runs against the same `DevframeDefinition` you'd pass to `createCli`. A commander example:

```ts [src/cli.ts]
import process from 'node:process'
import { Command } from 'commander'
import { defineDevframe } from 'devframe'
import { createBuild } from 'devframe/adapters/build'
import { createDevServer } from 'devframe/adapters/dev'

const devframe = defineDevframe({
  id: 'my-tool',
  name: 'My Tool',
  cli: { distDir: './dist/public', port: 7777 },
  setup(ctx, { flags }) { /* ... */ },
})

const program = new Command('my-tool')

program
  .command('dev', { isDefault: true })
  .option('-p, --port <port>', 'Port', '7777')
  .option('--config <file>', 'Config file path')
  .action(async (opts) => {
    const handle = await createDevServer(devframe, {
      port: Number(opts.port),
      flags: { config: opts.config },
      onReady: ({ origin }) => console.log(`Ready at ${origin}`),
    })
    process.on('SIGINT', () => handle.close().then(() => process.exit(0)))
  })

program
  .command('build')
  .option('--out-dir <dir>', 'Output directory', 'dist-static')
  .action(opts => createBuild(devframe, { outDir: opts.outDir }))

await program.parseAsync()
```

`createDevServer` returns the underlying `StartedServer` handle (`origin`, `port`, `app`, `wss`, `rpcGroup`, `close()`) so the surrounding program can drive graceful shutdown — SIGINT, hot reload, integration tests.

For typed flag schemas, `parseCliFlags(schema, rawBag)` (from `devframe/adapters/cli`) validates a commander/yargs flag bag against a `CliFlagsSchema` (the same `defineCliFlags(...)` value you'd put on `cli.flags`). Typed-schema validation works with any CLI framework.

## Why this shape

- **One command, one binary.** `createCli` is a complete CLI — dev, build, spa, mcp all from a single `defineDevframe` value.
- **Headless.** Your `onReady` callback owns startup output, so your tool's stdout stays yours.
- **Base-agnostic.** Same SPA build works at `/` (dev, standalone static) and at any deployment base.
- **Typed end-to-end.** RPC function definitions flow their types through to the client `rpc.call` site.
- **Agent-ready.** Add `agent: { description }` to any RPC function to expose it through the `mcp` subcommand.

## See also

- [Devframe Definition](./devframe-definition) — field reference
- [Adapters → CLI](./adapters#cli) — full CLI adapter reference including `configureCli` and mount-path rules
- [Adapters → Dev](./adapters#dev) — `createDevServer` reference for bring-your-own-CLI integration
- [Client](./client) — `connectDevframe`, shared state, caching
- [Agent-Native](./agent-native) — exposing your tool to Claude Desktop, Cursor, etc.
