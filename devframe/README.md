# DevFrame

Framework-neutral foundation for building generic DevTools — an RPC layer (birpc + valibot + WS presets), runtime hosts (RPC / docks / views / terminals / logs / commands / agent), and adapters that deploy a single devtool definition to seven targets: `cli`, `build`, `vite`, `kit`, `embedded`, `mcp`, plus the `spa` mode.

## Layout

This directory is staged for extraction into a standalone repository. Until then it lives inside the [`vitejs/devtools`](https://github.com/vitejs/devtools) monorepo.

| Path | Description |
|------|-------------|
| [`packages/devframe`](./packages/devframe) | The published [`devframe`](https://www.npmjs.com/package/devframe) npm package. |
| [`docs`](./docs) | VitePress documentation site, deployed at https://devfra.me/. |
| [`examples`](./examples) | End-to-end demos: [`devframe-counter`](./examples/devframe-counter) (smallest cross-adapter demo) and [`devframe-files-inspector`](./examples/devframe-files-inspector) (CLI dev/build/spa + Vite DevTools dock). |
| [`tests`](./tests) | Public-API snapshot tests via [`tsnapi`](https://github.com/posva/tsnapi). |

## Install

```sh
pnpm add devframe
```

## Documentation

See [https://devfra.me/](https://devfra.me/) for the full guide and API reference.

## Adapters

| Adapter | Use case |
|---------|----------|
| `cli` | Standalone CLI tool with `dev` / `build` / `mcp` subcommands. |
| `build` | Generates a static, self-contained SPA snapshot. |
| `vite` | Runs as a Vite plugin alongside the host app's dev server. |
| `kit` | Plugs into the DevTools Kit aggregator. |
| `embedded` | Mounts as an overlay inside another devtool's UI. |
| `mcp` | Exposes the devtool's RPC surface to coding agents over MCP. |

## License

[MIT](./packages/devframe/LICENSE.md)
