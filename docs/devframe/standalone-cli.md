---
outline: deep
---

# Standalone CLI with DevFrame

This recipe walks through building a standalone CLI devtool on top of DevFrame — the shape where a user runs `npx my-tool` and gets a local dev server serving a Vue / Nuxt / React SPA backed by type-safe RPC, plus `build` / `spa` / `mcp` subcommands for free.

It's the pattern used by tools like an ESLint config inspector or a bundler-config viewer: no Vite plugin, no host app — just a binary that opens a browser.

## What you ship

```
my-tool/
├── bin.mjs                  # shebang + import './dist/cli.mjs'
├── src/
│   ├── cli.ts               # defineDevtool + createCli
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
import c from 'ansis'
import { defineDevtool, defineRpcFunction } from 'devframe'
import { createCli } from 'devframe/adapters/cli'
import { resolve } from 'pathe'

const distDir = resolve(import.meta.dirname, '../dist/public')

const devtool = defineDevtool({
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

await createCli(devtool, {
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
my-tool build --out-dir dist-static         # offline snapshot
my-tool spa --out-dir dist-spa --base /tool/  # deployable SPA
my-tool mcp                                 # agent exposure (experimental)
```

## Nuxt SPA setup

For the Nuxt side, add the devframe helper module — it sets `app.baseURL: './'` / `vite.base: './'`, injects a client plugin that wires `connectDevtool()` into `useNuxtApp().$rpc`, and exposes the typed RPC client to the whole app:

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  ssr: false,
  modules: ['devframe/helpers/nuxt'],
  nitro: {
    preset: 'static',
    output: { dir: './dist' }, // matches createCli's distDir of ./dist/public
  },
})
```

Build with `nuxt build` and point `cli.distDir` at `./dist/public`. The SPA discovers its effective base at runtime — no `--base` rewrite needed. See the [Nuxt helper docs](/devframe/nuxt) for the full reference.

## Connecting from the client

With the Nuxt helper installed, use `$rpc` directly:

```ts [app/composables/payload.ts]
export async function fetchPayload() {
  const { $rpc } = useNuxtApp()
  return $rpc.call('my-tool:get-payload')
}
```

For non-Nuxt frontends (Vite + Vue, React, plain HTML, etc.), call `connectDevtool()` yourself:

```ts
import { connectDevtool } from 'devframe/client'

const rpc = await connectDevtool({ baseURL: './.devtools/' })
const payload = await rpc.call('my-tool:get-payload')
```

`connectDevtool` auto-resolves the connection descriptor relative to the current page — it works both in dev (WebSocket backend) and in the built static snapshot (`static` backend reads the baked RPC dump).

## Typed CLI flags

For flags that are specific to your tool, declare them as valibot schemas so they're validated at parse time and typed at the call site:

```ts
import type { InferCliFlags } from 'devframe'
import { defineCliFlags, defineDevtool } from 'devframe'
import * as v from 'valibot'

const appFlags = defineCliFlags({
  depth: v.pipe(v.number(), v.integer()),
  config: v.optional(v.string()),
  verbose: v.optional(v.boolean()),
})

defineDevtool({
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

defineDevtool({
  id: 'my-tool',
  name: 'My Tool',
  setup(ctx) {
    openHelpers.forEach(fn => ctx.rpc.register(fn))
  },
})
```

This registers `devframe:open-in-editor` (backed by [`launch-editor`](https://www.npmjs.com/package/launch-editor)) and `devframe:open-in-finder` (backed by [`open`](https://www.npmjs.com/package/open)). `launch-editor` is an optional peer dependency — install it in your tool's `package.json`.

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

DevFrame deliberately doesn't ship a storage primitive — [`unstorage`](https://unstorage.unjs.io/) is the recommended pattern for anything you want to cache between runs. Keep cache paths under `node_modules/.cache/<your-devtool-id>/` so the cache rotates with the project's `pnpm install`:

```ts
import { resolve } from 'pathe'
import { createStorage } from 'unstorage'
import fsDriver from 'unstorage/drivers/fs'

const cache = createStorage({
  driver: fsDriver({
    base: resolve(process.cwd(), 'node_modules/.cache/my-tool'),
  }),
})

defineDevtool({
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

DevFrame does not own the filesystem-watching concern — wire your own chokidar and signal the client via shared state:

```ts [src/cli.ts]
defineDevtool({
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

## Why this shape

- **One command, one binary.** `createCli` is a complete CLI — dev, build, spa, mcp all from a single `defineDevtool` value.
- **Headless.** No default banner; your `onReady` callback is the only stdout output that represents your tool.
- **Base-agnostic.** Same SPA build works at `/` (dev, standalone static) and at any deployment base.
- **Typed end-to-end.** RPC function definitions flow their types through to the client `rpc.call` site.
- **Agent-ready.** Add `agent: { description }` to any RPC function to expose it through the `mcp` subcommand.

## See also

- [Devtool Definition](/devframe/devtool-definition) — field reference
- [Adapters → CLI](/devframe/adapters#cli) — full CLI adapter reference including `configureCli` and mount-path rules
- [Client](/devframe/client) — `connectDevtool`, shared state, caching
- [Agent-Native](/devframe/agent-native) — exposing your tool to Claude Desktop, Cursor, etc.
