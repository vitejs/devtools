# Devframe

Framework-neutral foundation for building generic DevTools. Describe one devframe — its RPC, its data, its SPA, its CLI shape — and deploy the same definition through any of seven adapters.

Documentation: [https://devfra.me/](https://devfra.me/).

## Install

```sh
pnpm add devframe
```

## Hello, Devframe

```ts
import { defineDevframe, defineRpcFunction } from 'devframe'
import { createCli } from 'devframe/adapters/cli'

const devframe = defineDevframe({
  id: 'my-devframe',
  name: 'My Devframe',
  setup(ctx) {
    ctx.rpc.register(defineRpcFunction({
      name: 'my-devframe:hello',
      type: 'static',
      jsonSerializable: true,
      handler: () => ({ message: 'hello' }),
    }))
  },
})

await createCli(devframe).parse()
```

Drop the same definition into Vite DevTools via `createPluginFromDevframe` from `@vitejs/devtools-kit`. The dock entry is auto-derived from the definition.

## Adapters

| Adapter | Use case |
|---------|----------|
| `cli` | Standalone CLI tool with `dev` / `build` / `mcp` subcommands. |
| `build` | Generates a static, self-contained SPA snapshot. |
| `vite` | Runs as a Vite plugin alongside the host app's dev server. |
| `kit` | Mounts into the DevTools Kit aggregator. |
| `embedded` | Overlays inside another devframe's UI. |
| `mcp` | Surfaces the devframe's RPC to coding agents over MCP. |

## Repo layout

This directory is staged for extraction into a standalone repository. Until then it lives inside the [`vitejs/devtools`](https://github.com/vitejs/devtools) monorepo.

| Path | Description |
|------|-------------|
| [`packages/devframe`](./packages/devframe) | The published [`devframe`](https://www.npmjs.com/package/devframe) npm package. |
| [`docs`](./docs) | VitePress documentation site, deployed at https://devfra.me/. |
| [`examples`](./examples) | End-to-end demos: [`devframe-counter`](./examples/devframe-counter) (smallest cross-adapter demo), [`devframe-files-inspector`](./examples/devframe-files-inspector) (CLI dev/build/spa + Vite DevTools dock), and [`devframe-streaming-chat`](./examples/devframe-streaming-chat) (streaming channels demo). |
| [`tests`](./tests) | Public-API snapshot tests via [`tsnapi`](https://github.com/posva/tsnapi). |

## License

[MIT](./packages/devframe/LICENSE.md)
