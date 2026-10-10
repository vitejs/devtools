---
outline: deep
---

# Agents

Use `@vitejs/devtools-agent` to let an agent inspect Vite development activity and recorded Rolldown builds through MCP.

## Choose the data you need

| You want to investigate | Use | Data source |
| --- | --- | --- |
| Module imports, code transformations or plugin activity during development | Vite tools | Activity already observed by the running dev server |
| Output size, bundled dependencies or changes between builds | Rolldown tools | Recorded builds in `<project>/node_modules/.rolldown` |

For example, ask “Which plugin changed this module during development?” or “What made this build larger than the previous one?” The agent selects tools, reads measurements and follows up with more queries. Queries read existing data; generating new observations requires visiting the app or recording a build.

## Connect your agent

### 1. Install and enable

Install the agent integration alongside Vite DevTools:

```bash
pnpm add -D @vitejs/devtools @vitejs/devtools-agent
```

For Vite development inspection, also install `@vitejs/devtools-vite`:

```bash
pnpm add -D @vitejs/devtools-vite
```

Enable the host in your Vite configuration. It automatically mounts the installed integrations.

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  devtools: { apply: 'serve' },
})
```

### 2. Configure MCP

Add the connector to your agent's MCP configuration:

```json
{
  "mcpServers": {
    "devframe": {
      "command": "npx",
      "args": ["devframe", "connect"]
    }
  }
}
```

Start the dev server and open Vite DevTools in the app to make the host discoverable. Keep the server running while the agent queries it. For connector options, see [devframe](https://devfra.me/guide/).

### 3. Select the project

Ask the agent to discover instances, match `rootDir` to your project directory and use the selected port for tool calls. If several servers match, select the intended server before investigating.

Within that host, Vite queries select an instance and environment with `vite` and `env`. Rolldown queries select a recorded build with `session`.

## Vite: inspect development activity

> Find `src/main.ts` in the client environment. Show its importers and identify which transformation steps changed its code.

Start with `environments`, search with `modules`, then use the exact module id with `module` or `transforms`. Pass the chosen `vite` and `env` to each query.

Tool names use the prefix `vite:agent:`.

| Tool | Use it to |
| --- | --- |
| `environments` | Discover instance ids, project roots and environment names |
| `modules` | Search module ids and rank by transform duration or id |
| `module` | Inspect an exact module's imports and importers |
| `transforms` | Read the recorded resolved id and load/transform steps |
| `plugins` | Search plugin resolve/transform timings and call counts |

### Read transformation code

`transforms` returns step metadata by default. To inspect code:

1. Set `includeCode: true`.
2. Select a step with `offset` and `limit: 1`.
3. Read its `code`, then increase `codeOffset` by 4,000 while `codeHasMore` is true.

Each step returns up to 4,000 UTF-16 code units per call. Queries use recorded steps without triggering another transformation.

## Rolldown: inspect recorded builds

Rolldown tools query recorded builds in `<project>/node_modules/.rolldown` while the dev server runs. Enable `build.rolldownOptions.devtools` and run a build to record one.

> Compare this project's latest two recorded builds. Show the largest output-size increases and trace the dependencies in the affected files.

Use `project` to confirm the directory and `list-sessions` to select builds. For a single build, follow `summary` → `assets` → `modules` → `trace-dependency`.

Tool names use the prefix `vite:rolldown:agent:`.

| Tool | Use it to |
| --- | --- |
| `project` | Confirm project and workspace directories |
| `list-sessions` | List recorded builds, newest first |
| `summary` | Read build totals, entries and available data |
| `assets` | Find output files by filename or initial/async/static scope |
| `modules` | Find module ids, optionally within an output file |
| `module` | Inspect an exact module's imports and importers |
| `packages` | Find packages, duplicate copies and transformed code sizes |
| `plugins` | Query hook timings and call counts by plugin and hook |
| `trace-dependency` | Follow dependency paths for a module, package or output file |
| `compare` | Compare asset, chunk, package or plugin changes between builds |

### Select a stable build

For session-based queries, omit `session` or use `latest` to begin. Use the returned session id for follow-up queries so a newly recorded build does not change the investigation. The `module` tool returns `null` when the requested module is absent.

`compare` requires two concrete session ids. Deltas are **after minus before**, with changed items ranked by absolute delta. Hashed filenames are matched heuristically, so renamed outputs can appear as additions and removals.

## Understand the results

### Pagination and partial data

List responses include `items`, `total`, `offset`, `limit` and `hasMore`. Search filters apply before pagination. Most lists allow up to 100 items per page; Vite transformations allow 20 steps. Dependency tracing uses a path limit rather than offset pagination.

| Result | Meaning and next step |
| --- | --- |
| Vite `available: false` | Install the Vite integration and restart, or check manual registration |
| Empty Vite modules or transformations | Visit the relevant app page to produce observations, then query again |
| Empty Rolldown sessions | Enable build recording and run a build |
| Package graph unsupported | Package data is unavailable; this does not establish that dependencies are absent |
| Trace `truncated: true` | Limits omitted paths; narrow the target or adjust the path/depth limit |

Trace paths report where they stop: a recorded entry, graph root, missing node, cycle or depth limit. A graph root is not necessarily an application entry. Paths show recorded connections; they do not establish which exports survive tree shaking.

### Metric meanings

| Measurement | Meaning |
| --- | --- |
| Asset bytes | Uncompressed emitted file size |
| Package bytes | Transformed code size before final output optimization |
| Chunk comparison bytes | Emitted size where available, otherwise transformed size |
| Plugin duration | Sum of recorded hook milliseconds; calls can overlap |

Plugin timings alone do not establish wall-clock savings or explain an HMR issue. Use them to choose where to inspect next.

## Manual registration

With `builtinDevTools: false`, register the agent and any required inspector explicitly:

```ts
import { DevToolsAgent } from '@vitejs/devtools-agent'
import { DevToolsViteInspect } from '@vitejs/devtools-vite'
import { defineConfig } from 'vite'

export default defineConfig({
  devtools: { apply: 'serve', builtinDevTools: false },
  plugins: [DevToolsAgent(), DevToolsViteInspect()],
})
```

Include `DevToolsViteInspect()` when inspecting development activity. Rolldown tools read recorded logs through the agent integration. Set `devtools.mcp` to `false` to disable the host's MCP endpoint.
