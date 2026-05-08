---
outline: deep
---

# Agent-Native Devframe

::: warning Experimental
The agent-native surface (`agent` field on `defineRpcFunction`, `DevToolsAgentHost`, and the `devframe/adapters/mcp` adapter) is experimental and may change without a major version bump until it stabilizes.
:::

Devframe can expose the same surface the browser DevTools UI consumes — RPC functions, resources, and shared state — to coding agents (Claude Desktop / Cursor / Zed / Claude Code, or any MCP-speaking client). Agent exposure is opt-in per function; functions stay private by default.

## How it works

Three building blocks:

1. **An `agent` field on `defineRpcFunction`.** Add `agent: { description, ... }` to opt a function in. Functions without the field stay private.
2. **`ctx.agent`** — a host exposed on `DevToolsNodeContext`. Plugins register tools that aren't backed by an RPC, and expose readable resources (e.g. a Markdown build summary).
3. **The MCP adapter** (`devframe/adapters/mcp`) — translates the agent host into a [Model Context Protocol](https://modelcontextprotocol.io) server, currently over `stdio`.

## Exposing an RPC function

```ts
import { defineRpcFunction } from 'devframe'

export const getSessionSummary = defineRpcFunction({
  name: 'rolldown-get-session-summary',
  type: 'query',
  args: [v.object({ sessionId: v.string() })],
  returns: v.object({ durationMs: v.number(), chunkCount: v.number() }),
  agent: {
    description: 'Summarize a Rolldown build session. Safe to call freely.',
    title: 'Build summary',
    // safety inferred from `type: 'query'` → 'read'
  },
  setup: ctx => ({
    handler: async ({ sessionId }) => {
      // ...
    },
  }),
})
```

Agent tools take a single object input. The MCP adapter synthesises `arg0`, `arg1`, … from positional args (`args: [A, B]`); a single object schema (`args: [v.object({ ... })]`) reads better at the agent boundary because property names are self-describing.

## Registering a plugin tool

For tools without a matching RPC — say, an on-demand narrative summary — register them directly:

```ts
export default defineDevtool({
  id: 'my-plugin',
  setup(ctx) {
    ctx.agent.registerTool({
      id: 'my-plugin:summarize',
      description: 'Plain-text summary of the current build state.',
      safety: 'read',
      handler: async () => ({
        markdown: buildSummary(),
      }),
    })
  },
})
```

## Registering a resource

Resources surface readable snapshots of state, identified by URI:

```ts
ctx.agent.registerResource({
  id: 'current-session',
  name: 'Current Rolldown session',
  description: 'Markdown snapshot of the active build session.',
  mimeType: 'text/markdown',
  read: () => ({ text: renderMarkdown(currentSession) }),
})
```

Every `ctx.rpc.sharedState` key is also automatically exposed to MCP as `devframe://state/<key>`. Pass `exposeSharedState: false` (or a filter function) to `createMcpServer` to opt out.

## Starting the MCP server

The simplest path is the CLI:

```sh
# Run your devtool with an MCP stdio server attached.
devframe mcp
```

Programmatic equivalent:

```ts
import { defineDevtool } from 'devframe'
import { createMcpServer } from 'devframe/adapters/mcp'

const devtool = defineDevtool({ /* … */ })

await createMcpServer(devtool, { transport: 'stdio' })
```

`@modelcontextprotocol/sdk` is a peer dependency — add it to your package when you want to ship an MCP-enabled devtool.

## Connecting Claude Desktop

Add an entry to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "my-devtool": {
      "command": "pnpm",
      "args": ["--filter", "my-devtool", "exec", "devframe", "mcp"]
    }
  }
}
```

Restart Claude Desktop. The tools you flagged with `agent: { ... }` (plus any `registerTool` calls) show up in the MCP tool drawer. Resources are reachable as `devframe://resource/<id>` and `devframe://state/<key>` URIs.

## Safety model

- **Opt-in exposure.** Functions opt in via the `agent` field; everything else stays private.
- **`safety`** — one of `'read'`, `'action'`, `'destructive'`. Inferred from the RPC `type` (`static`/`query` → `read`, `action`/`event` → `action`), with explicit override available.
- The MCP adapter maps `safety` to tool annotations (`readOnlyHint`, `destructiveHint`). MCP clients use these to decide whether to prompt for confirmation before calling.

## CLI

| Command | Description |
|---------|-------------|
| `devframe mcp` | Start an MCP server on `stdio`. |
