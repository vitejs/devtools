# devframe

Framework-neutral foundation for building generic DevTools — RPC layer (birpc + valibot + WS presets), six hosts (RPC / docks / views / terminals / logs / commands / agent), and adapters under `devframe/adapters/*` (cli / build / spa / vite / kit / embedded / mcp). Part of the [Vite DevTools](https://devtools.vite.dev) monorepo.

## Install

```sh
pnpm add devframe
```

## Docs

See the [DevFrame documentation](https://devtools.vite.dev/devframe/) for the full guide and API reference.

## Agent-Native (experimental)

> ⚠️ **Experimental.** The agent-native surface — the `agent` field on `defineRpcFunction`, `DevToolsAgentHost`, and the `devframe/adapters/mcp` adapter — is experimental and may change without a major version bump until it stabilizes.

DevFrame can expose a devtool's RPC functions, tools, and resources to coding agents over [MCP](https://modelcontextprotocol.io). Flag an RPC function with `agent: { description }` to surface it, then spin up an MCP server:

```ts
import { defineDevtool, defineRpcFunction } from 'devframe'
import { createMcpServer } from 'devframe/adapters/mcp'

const getSummary = defineRpcFunction({
  name: 'my-plugin:get-summary',
  type: 'query',
  agent: {
    description: 'Return a short summary of the current build state.',
  },
  setup: ctx => ({ handler: async () => buildSummary() }),
})

const devtool = defineDevtool({
  id: 'my-plugin',
  setup(ctx) {
    ctx.rpc.register(getSummary)
    // Optional: register tools or resources directly.
    ctx.agent.registerResource({
      id: 'latest-build',
      name: 'Latest build',
      read: () => ({ text: renderMarkdown(latestBuild) }),
    })
  },
})

await createMcpServer(devtool, { transport: 'stdio' })
```

Or via the CLI:

```sh
devframe mcp
```

`@modelcontextprotocol/sdk` is a peer dependency — add it to your package when you want to ship MCP support.

See the [Agent-Native guide](https://devtools.vite.dev/devframe/agent-native) for the full API, safety model, and Claude Desktop integration example.

## License

[MIT](./LICENSE.md)
