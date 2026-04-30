---
outline: deep
---

# Agent-Native DevFrame

::: warning Experimental
The agent-native surface (`agent` field on `defineRpcFunction`, `DevToolsAgentHost`, and the `devframe/adapters/mcp` adapter) is experimental and may change without a major version bump until it stabilizes.
:::

DevFrame can expose the same surface the browser DevTools UI consumes — RPC functions, resources, and shared state — to coding agents (Claude Desktop / Cursor / Zed / Claude Code, or any MCP-speaking client). Plugins opt in to agent exposure explicitly; everything else stays private by default.

## How it works

Three building blocks:

1. **An `agent` field on `defineRpcFunction`.** Add `agent: { description, ... }` to opt a function in. Omit the field (default) to keep it private.
2. **`ctx.agent`** — a host exposed on `DevToolsNodeContext`. Plugins can register tools that aren't backed by an RPC, or expose readable resources (e.g. a Markdown build summary).
3. **The MCP adapter** (`devframe/adapters/mcp`) — translates the agent host into a [Model Context Protocol](https://modelcontextprotocol.io) server. Today it speaks `stdio`; HTTP transport is planned.

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

Tip: agent tools take a single object input. If your RPC uses positional args (`args: [A, B]`), the MCP adapter synthesizes `arg0`, `arg1`, ... automatically — but agents work best with a single object schema (`args: [v.object({ ... })]`) so property names are self-describing.

## Registering a plugin tool

When a tool doesn't naturally correspond to an RPC — e.g. an on-demand narrative summary — register it directly:

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

You can also call it programmatically:

```ts
import { defineDevtool } from 'devframe'
import { createMcpServer } from 'devframe/adapters/mcp'

const devtool = defineDevtool({ /* … */ })

await createMcpServer(devtool, { transport: 'stdio' })
```

`@modelcontextprotocol/sdk` is a peer dependency — add it to your package when you want to ship an MCP-enabled devtool.

## Hooking into Claude Desktop

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

- **Default-deny.** Functions without an `agent` field are not exposed.
- **`safety`** — one of `'read'`, `'action'`, `'destructive'`. Inferred from the RPC `type` (`static`/`query` → `read`, `action`/`event` → `action`), with explicit override available.
- The MCP adapter maps `safety` to tool annotations (`readOnlyHint`, `destructiveHint`). MCP clients use these to decide whether to prompt for confirmation before calling.

## CLI

| Command | Description |
|---------|-------------|
| `devframe mcp` | Start an MCP server on `stdio`. |

More CLI subcommands (`devframe agent list / call / read`) are planned.

## What's next

- HTTP (streamable) MCP transport with a real auth model.
- A `devframe agent ...` CLI for agents that drive via bash rather than MCP.
- A built-in `~agent` dock in the browser UI for auditing the agent surface.
