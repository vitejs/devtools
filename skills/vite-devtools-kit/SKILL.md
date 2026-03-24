---
name: writing-vite-devtools-integrations
description: >
  Creates devtools integrations for Vite using @vitejs/devtools-kit.
  Use when building Vite plugins with devtools panels, RPC functions,
  dock entries, shared state, logs/notifications, or any devtools-related
  functionality. Applies to files importing from @vitejs/devtools-kit or
  containing devtools.setup hooks in Vite plugins.
---

# Vite DevTools Kit

Build custom developer tools that integrate with Vite DevTools using `@vitejs/devtools-kit`.

## Core Concepts

A DevTools plugin extends a Vite plugin with a `devtools.setup(ctx)` hook. The context provides:

| Property | Purpose |
|----------|---------|
| `ctx.docks` | Register dock entries (iframe, action, custom-render, launcher, json-render) |
| `ctx.views` | Host static files for UI |
| `ctx.rpc` | Register RPC functions, broadcast to clients |
| `ctx.rpc.sharedState` | Synchronized server-client state |
| `ctx.logs` | Emit structured log entries and toast notifications |
| `ctx.terminals` | Spawn and manage child processes with streaming terminal output |
| `ctx.createJsonRenderer` | Create server-side JSON render specs for zero-client-code UIs |
| `ctx.commands` | Register executable commands with keyboard shortcuts and palette visibility |
| `ctx.viteConfig` | Resolved Vite configuration |
| `ctx.viteServer` | Dev server instance (dev mode only) |
| `ctx.mode` | `'dev'` or `'build'` |

## Quick Start: Minimal Plugin

```ts
/// <reference types="@vitejs/devtools-kit" />
import type { Plugin } from 'vite'

export default function myPlugin(): Plugin {
  return {
    name: 'my-plugin',
    devtools: {
      setup(ctx) {
        ctx.docks.register({
          id: 'my-plugin',
          title: 'My Plugin',
          icon: 'ph:puzzle-piece-duotone',
          type: 'iframe',
          url: 'https://example.com/devtools',
        })
      },
    },
  }
}
```

## Quick Start: Full Integration

```ts
/// <reference types="@vitejs/devtools-kit" />
import type { Plugin } from 'vite'
import { fileURLToPath } from 'node:url'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export default function myAnalyzer(): Plugin {
  const data = new Map<string, { size: number }>()

  return {
    name: 'my-analyzer',

    // Collect data in Vite hooks
    transform(code, id) {
      data.set(id, { size: code.length })
    },

    devtools: {
      setup(ctx) {
        // 1. Host static UI
        const clientPath = fileURLToPath(
          new URL('../dist/client', import.meta.url)
        )
        ctx.views.hostStatic('/.my-analyzer/', clientPath)

        // 2. Register dock entry
        ctx.docks.register({
          id: 'my-analyzer',
          title: 'Analyzer',
          icon: 'ph:chart-bar-duotone',
          type: 'iframe',
          url: '/.my-analyzer/',
        })

        // 3. Register RPC function
        ctx.rpc.register(
          defineRpcFunction({
            name: 'my-analyzer:get-data',
            type: 'query',
            setup: () => ({
              handler: async () => Array.from(data.entries()),
            }),
          })
        )
      },
    },
  }
}
```

## Namespacing Convention

**CRITICAL**: Always prefix RPC functions, shared state keys, dock IDs, and command IDs with your plugin name:

```ts
// Good - namespaced
'my-plugin:get-modules'
'my-plugin:state'
'my-plugin:clear-cache'  // command ID

// Bad - may conflict
'get-modules'
'state'
```

## Dock Entry Types

| Type | Use Case |
|------|----------|
| `iframe` | Full UI panels, dashboards (most common) |
| `json-render` | Server-side JSON specs — zero client code needed |
| `action` | Buttons that trigger client-side scripts (inspectors, toggles) |
| `custom-render` | Direct DOM access in panel (framework mounting) |
| `launcher` | Actionable setup cards for initialization tasks |

### Iframe Entry

```ts
ctx.docks.register({
  id: 'my-plugin',
  title: 'My Plugin',
  icon: 'ph:house-duotone',
  type: 'iframe',
  url: '/.my-plugin/',
})
```

### Action Entry

```ts
ctx.docks.register({
  id: 'my-inspector',
  title: 'Inspector',
  icon: 'ph:cursor-duotone',
  type: 'action',
  action: {
    importFrom: 'my-plugin/devtools-action',
    importName: 'default',
  },
})
```

### Custom Render Entry

```ts
ctx.docks.register({
  id: 'my-custom',
  title: 'Custom View',
  icon: 'ph:code-duotone',
  type: 'custom-render',
  renderer: {
    importFrom: 'my-plugin/devtools-renderer',
    importName: 'default',
  },
})
```

### JSON Render Entry

Build UIs entirely from server-side TypeScript — no client code needed:

```ts
const ui = ctx.createJsonRenderer({
  root: 'root',
  elements: {
    root: {
      type: 'Stack',
      props: { direction: 'vertical', gap: 12 },
      children: ['heading', 'info'],
    },
    heading: {
      type: 'Text',
      props: { content: 'Hello from JSON!', variant: 'heading' },
    },
    info: {
      type: 'KeyValueTable',
      props: {
        entries: [
          { key: 'Version', value: '1.0.0' },
          { key: 'Status', value: 'Running' },
        ],
      },
    },
  },
})

ctx.docks.register({
  id: 'my-panel',
  title: 'My Panel',
  icon: 'ph:chart-bar-duotone',
  type: 'json-render',
  ui,
})
```

### Launcher Entry

```ts
const entry = ctx.docks.register({
  id: 'my-setup',
  title: 'My Setup',
  icon: 'ph:rocket-launch-duotone',
  type: 'launcher',
  launcher: {
    title: 'Initialize My Plugin',
    description: 'Run initial setup before using the plugin',
    buttonStart: 'Start Setup',
    buttonLoading: 'Setting up...',
    onLaunch: async () => {
      // Run initialization logic
    },
  },
})
```

## Terminals & Subprocesses

Spawn and manage child processes with streaming terminal output:

```ts
const session = await ctx.terminals.startChildProcess(
  {
    command: 'vite',
    args: ['build', '--watch'],
    cwd: process.cwd(),
  },
  {
    id: 'my-plugin:build-watcher',
    title: 'Build Watcher',
    icon: 'ph:terminal-duotone',
  },
)

// Lifecycle controls
await session.terminate()
await session.restart()
```

A common pattern is combining with launcher docks — see [Terminals Patterns](./references/terminals-patterns.md).

## Commands & Command Palette

Register executable commands discoverable via `Mod+K` palette:

```ts
import { defineCommand } from '@vitejs/devtools-kit'

ctx.commands.register(defineCommand({
  id: 'my-plugin:clear-cache',
  title: 'Clear Build Cache',
  icon: 'ph:trash-duotone',
  keybindings: [{ key: 'Mod+Shift+C' }],
  when: 'clientType == embedded',
  handler: async () => { /* ... */ },
}))
```

Commands support sub-commands (two-level hierarchy), conditional visibility via `when` clauses, and user-customizable keyboard shortcuts.

See [Commands Patterns](./references/commands-patterns.md) and [When Clauses](./references/when-clauses.md) for full details.

## Logs & Notifications

Plugins can emit structured log entries from both server and client contexts. Logs appear in the built-in **Logs** panel and can optionally show as toast notifications.

### Fire-and-Forget

```ts
// No await needed
context.logs.add({
  message: 'Plugin initialized',
  level: 'info',
})
```

### With Handle

```ts
const handle = await context.logs.add({
  id: 'my-build',
  message: 'Building...',
  level: 'info',
  status: 'loading',
})

// Update later
await handle.update({
  message: 'Build complete',
  level: 'success',
  status: 'idle',
})

// Or dismiss
await handle.dismiss()
```

### Key Fields

| Field | Type | Description |
|-------|------|-------------|
| `message` | `string` | Short title (required) |
| `level` | `'info' \| 'warn' \| 'error' \| 'success' \| 'debug'` | Severity (required) |
| `description` | `string` | Detailed description |
| `notify` | `boolean` | Show as toast notification |
| `filePosition` | `{ file, line?, column? }` | Source file location (clickable) |
| `elementPosition` | `{ selector?, boundingBox?, description? }` | DOM element position |
| `id` | `string` | Explicit id for deduplication |
| `status` | `'loading' \| 'idle'` | Shows spinner when loading |
| `category` | `string` | Grouping (e.g., `'a11y'`, `'lint'`) |
| `labels` | `string[]` | Tags for filtering |
| `autoDismiss` | `number` | Toast auto-dismiss time in ms (default: 5000) |
| `autoDelete` | `number` | Auto-delete time in ms |

The `from` field is automatically set to `'server'` or `'browser'`.

### Deduplication

Re-adding with the same `id` updates the existing entry instead of creating a duplicate:

```ts
context.logs.add({ id: 'my-scan', message: 'Scanning...', level: 'info', status: 'loading' })
context.logs.add({ id: 'my-scan', message: 'Scan complete', level: 'success', status: 'idle' })
```

## RPC Functions

### Server-Side Definition

```ts
import { defineRpcFunction } from '@vitejs/devtools-kit'

const getModules = defineRpcFunction({
  name: 'my-plugin:get-modules',
  type: 'query', // 'query' | 'action' | 'static'
  setup: ctx => ({
    handler: async (filter?: string) => {
      // ctx has full DevToolsNodeContext
      return modules.filter(m => !filter || m.includes(filter))
    },
  }),
})

// Register in setup
ctx.rpc.register(getModules)
```

### Client-Side Call (iframe)

```ts
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'

const rpc = await getDevToolsRpcClient()
const modules = await rpc.call('my-plugin:get-modules', 'src/')
```

### Client-Side Call (action/renderer script)

```ts
import type { DevToolsClientScriptContext } from '@vitejs/devtools-kit/client'

export default function setup(ctx: DevToolsClientScriptContext) {
  ctx.current.events.on('entry:activated', async () => {
    const data = await ctx.current.rpc.call('my-plugin:get-data')
  })
}
```

## Client Context

The global client context (`DevToolsClientContext`) provides access to the RPC client and is set automatically when DevTools initializes (embedded or standalone). Use `getDevToolsClientContext()` to access it from anywhere on the client side:

```ts
import { getDevToolsClientContext } from '@vitejs/devtools-kit/client'

const ctx = getDevToolsClientContext()
if (ctx) {
  const modules = await ctx.rpc.call('my-plugin:get-modules')
}
```

### Broadcasting to Clients

```ts
// Server broadcasts to all clients
ctx.rpc.broadcast({
  method: 'my-plugin:on-update',
  args: [{ changedFile: '/src/main.ts' }],
})
```

## Type Safety

Extend the DevTools Kit interfaces for full type checking:

```ts
// src/types.ts
import '@vitejs/devtools-kit'

declare module '@vitejs/devtools-kit' {
  interface DevToolsRpcServerFunctions {
    'my-plugin:get-modules': (filter?: string) => Promise<Module[]>
  }

  interface DevToolsRpcClientFunctions {
    'my-plugin:on-update': (data: { changedFile: string }) => void
  }

  interface DevToolsRpcSharedStates {
    'my-plugin:state': MyPluginState
  }
}
```

## Shared State

### Server-Side

```ts
const state = await ctx.rpc.sharedState.get('my-plugin:state', {
  initialValue: { count: 0, items: [] },
})

// Read
console.log(state.value())

// Mutate (auto-syncs to clients)
state.mutate((draft) => {
  draft.count += 1
  draft.items.push('new item')
})
```

### Client-Side

```ts
const client = await getDevToolsRpcClient()
const state = await client.rpc.sharedState.get('my-plugin:state')

// Read
console.log(state.value())

// Subscribe to changes
state.on('updated', (newState) => {
  console.log('State updated:', newState)
})
```

## Client Scripts

For action buttons and custom renderers:

```ts
// src/devtools-action.ts
import type { DevToolsClientScriptContext } from '@vitejs/devtools-kit/client'

export default function setup(ctx: DevToolsClientScriptContext) {
  ctx.current.events.on('entry:activated', () => {
    console.log('Action activated')
    // Your inspector/tool logic here
  })

  ctx.current.events.on('entry:deactivated', () => {
    console.log('Action deactivated')
    // Cleanup
  })
}
```

Export from package.json:

```json
{
  "exports": {
    ".": "./dist/index.mjs",
    "./devtools-action": "./dist/devtools-action.mjs"
  }
}
```

## Debugging with Self-Inspect

Use `@vitejs/devtools-self-inspect` to debug your DevTools plugin. It shows registered RPC functions, dock entries, client scripts, and plugins in a meta-introspection UI at `/.devtools-self-inspect/`.

```ts
import DevTools from '@vitejs/devtools'
import DevToolsSelfInspect from '@vitejs/devtools-self-inspect'

export default defineConfig({
  plugins: [
    DevTools(),
    DevToolsSelfInspect(),
  ],
})
```

## Best Practices

1. **Always namespace** - Prefix all identifiers with your plugin name
2. **Use type augmentation** - Extend `DevToolsRpcServerFunctions` for type-safe RPC
3. **Keep state serializable** - No functions or circular references in shared state
4. **Batch mutations** - Use single `mutate()` call for multiple changes
5. **Host static files** - Use `ctx.views.hostStatic()` for your UI assets
6. **Use Iconify icons** - Prefer `ph:*` (Phosphor) icons: `icon: 'ph:chart-bar-duotone'`
7. **Deduplicate logs** - Use explicit `id` for logs representing ongoing operations
8. **Use Self-Inspect** - Add `@vitejs/devtools-self-inspect` during development to debug your plugin
9. **Namespace command IDs** - Use `my-plugin:action` pattern for command IDs, same as RPC and state
10. **Use `when` clauses** - Conditionally show commands/docks with `when` expressions instead of programmatic show/hide

## Example Plugins

Real-world example plugins in the repo — reference their code structure and patterns when building new integrations:

- **A11y Checker** ([`examples/plugin-a11y-checker`](https://github.com/vitejs/devtools/tree/main/examples/plugin-a11y-checker)) — Action dock entry, client-side axe-core audits, logs with severity levels and element positions, log handle updates
- **File Explorer** ([`examples/plugin-file-explorer`](https://github.com/vitejs/devtools/tree/main/examples/plugin-file-explorer)) — Iframe dock entry, RPC functions (static/query/action), hosted UI panel, RPC dump for static builds, backend mode detection
- **Git UI** ([`examples/plugin-git-ui`](https://github.com/vitejs/devtools/tree/main/examples/plugin-git-ui)) — JSON render dock entry, server-side JSON specs, `$bindState` two-way binding, `$state` in action params, dynamic badge updates

## Further Reading

- [RPC Patterns](./references/rpc-patterns.md) - Advanced RPC patterns and type utilities
- [Dock Entry Types](./references/dock-entry-types.md) - Detailed dock configuration options
- [Shared State Patterns](./references/shared-state-patterns.md) - Framework integration examples
- [Project Structure](./references/project-structure.md) - Recommended file organization
- [JSON Render Patterns](./references/json-render-patterns.md) - Server-side JSON specs, components, state binding
- [Terminals Patterns](./references/terminals-patterns.md) - Child processes, custom streams, session lifecycle
- [Logs Patterns](./references/logs-patterns.md) - Log entries, toast notifications, and handle patterns
- [Commands Patterns](./references/commands-patterns.md) - Command registration, sub-commands, keybindings, palette integration
- [When Clauses](./references/when-clauses.md) - Conditional expression syntax, context variables, API reference
