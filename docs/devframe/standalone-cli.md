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

Configure Nuxt for static, base-agnostic output:

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  ssr: false,
  nitro: {
    preset: 'static',
    output: { dir: './dist' }, // matches createCli's distDir of ./dist/public
  },
  app: {
    baseURL: './', // relative asset paths
  },
  vite: {
    base: './', // relative asset paths — base-agnostic build
  },
})
```

Build with `nuxt build` and point `cli.distDir` at `./dist/public`. The SPA discovers its effective base at runtime — no `--base` rewrite needed.

## Connecting from the client

In a Vue SFC, composable, or any browser code:

```ts [app/composables/payload.ts]
import { connectDevtool } from 'devframe/client'

export async function fetchPayload() {
  const rpc = await connectDevtool()
  return rpc.call('my-tool:get-payload')
}
```

`connectDevtool` auto-resolves the connection descriptor relative to the current page — it works both in dev (WebSocket backend) and in the built static snapshot (`static` backend reads the baked RPC dump).

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
