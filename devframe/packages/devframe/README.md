# devframe

Framework-neutral foundation for building generic DevTools. Describe one devframe — its RPC, its data, its SPA, its CLI shape — and deploy the same definition through any of seven adapters.

Part of the [Vite DevTools](https://devtools.vite.dev) monorepo. Full documentation: [https://devfra.me/](https://devfra.me/).

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

## Adapters

| Adapter | Use case |
|---------|----------|
| `cli` | Standalone CLI tool with `dev` / `build` / `mcp` subcommands. |
| `build` | Generates a static, self-contained SPA snapshot. |
| `vite` | Runs as a Vite plugin alongside the host app's dev server. |
| `kit` | Mounts into the DevTools Kit aggregator. |
| `embedded` | Overlays inside another devtool's UI. |
| `mcp` | Surfaces the devframe's RPC to coding agents over MCP. |

## Agent-Native (experimental)

> [!WARNING]
> The agent-native surface — the `agent` field on `defineRpcFunction`, `DevToolsAgentHost`, and the `devframe/adapters/mcp` adapter — may change without a major version bump until it stabilizes.

Devframe surfaces a devframe's RPC functions, tools, and resources to coding agents over [MCP](https://modelcontextprotocol.io). Flag an RPC function with `agent: { description }` to expose it, then spin up an MCP server:

```ts
import { defineDevframe, defineRpcFunction } from 'devframe'
import { createMcpServer } from 'devframe/adapters/mcp'

const getSummary = defineRpcFunction({
  name: 'my-plugin:get-summary',
  type: 'query',
  agent: {
    description: 'Return a short summary of the current build state.',
  },
  setup: ctx => ({ handler: async () => buildSummary() }),
})

const devframe = defineDevframe({
  id: 'my-plugin',
  setup(ctx) {
    ctx.rpc.register(getSummary)
    ctx.agent.registerResource({
      id: 'latest-build',
      name: 'Latest build',
      read: () => ({ text: renderMarkdown(latestBuild) }),
    })
  },
})

await createMcpServer(devframe, { transport: 'stdio' })
```

Or via the CLI: `devframe mcp`. `@modelcontextprotocol/sdk` is a peer dependency — add it when you want MCP support. See the [Agent-Native guide](https://devfra.me/guide/agent-native) for the full API and Claude Desktop integration example.

## License

[MIT](./LICENSE.md)
