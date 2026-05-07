# devframe-files-inspector

A simplified [node-modules-inspector](https://github.com/antfu/node-modules-inspector)-style example built on [devframe](../../packages/devframe). Lists files in the current working directory and renders them through a Preact SPA. Exercises every devframe surface end-to-end:

- **CLI dev server** — `node bin.mjs` boots an HTTP + WebSocket server backing live RPC.
- **Static build** — `node bin.mjs build` produces a self-contained directory (SPA + baked RPC dump) deployable to any static host.
- **Vite DevTools dock** — `import devtoolsFilesInspector from 'devframe-files-inspector-example/src/plugin'` plugs into a host Vite app via `@vitejs/devtools`.

The Preact client showcases two patterns relevant to devframe authors:

1. **Runtime base discovery.** The client is built with `vite.base: './'` and reads `document.baseURI` at runtime to resolve its mount path. The same `dist/client` works under any base path (`/__devframe-files-inspector/`, `/`, `/custom/`, …) without rebuilding.
2. **Two RPC types.** `:list-files` is a `query` with `dump.inputs: [[]]` (live in dev, baked in static). `:get-cwd` is a `static` RPC.

## Run

```sh
pnpm install
pnpm -C examples/devframe-files-inspector run build       # build the Preact client
pnpm -C examples/devframe-files-inspector run dev         # http://127.0.0.1:9876/__devframe-files-inspector/
pnpm -C examples/devframe-files-inspector run cli:build   # static deploy in ./dist/static
serve examples/devframe-files-inspector/dist/static       # any static host works (relative paths)
pnpm -C examples/devframe-files-inspector run test        # E2E tests
```

## File map

| Path | Purpose |
|------|---------|
| `src/devtool.ts` | The single `DevtoolDefinition` consumed by every adapter. |
| `src/plugin.ts` | `createKitPlugin(devtool)` re-export for `@vitejs/devtools`. |
| `src/client/` | Preact SPA: `index.html`, `main.tsx`, `app.tsx`, `routes/*`, `vite.config.ts`. |
| `bin.mjs` | `createCli(devtool).parse()` — exposes `dev`, `build`, `spa`, `mcp`. |
| `tests/` | E2E tests for dev server, static build, and kit plugin shape. |
