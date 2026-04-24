---
outline: deep
---

# Commands

The commands system registers executable actions that appear in the global command palette. Users can discover them via search, trigger them through keyboard shortcuts, or drill down into grouped children.

## Registering a Command

```ts
import { defineCommand, defineDevtool } from 'devframe'

const clearCache = defineCommand({
  id: 'my-devtool:clear-cache',
  title: 'Clear Build Cache',
  description: 'Remove all cached build artifacts',
  icon: 'ph:trash-duotone',
  category: 'tools',
  handler: async () => {
    await fs.rm('.cache', { recursive: true })
  },
})

export default defineDevtool({
  id: 'my-devtool',
  name: 'My Devtool',
  setup(ctx) {
    ctx.commands.register(clearCache)
  },
})
```

## Options

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | **Required.** Globally unique, namespaced (`<devtool-id>:<action>`). |
| `title` | `string` | **Required.** Human-readable label. |
| `description` | `string` | Shown under the title in the palette. |
| `icon` | `string` | Iconify name, e.g. `ph:trash-duotone`. |
| `category` | `string` | Free-form grouping. |
| `showInPalette` | `boolean \| 'without-children'` | Default `true`. Use `'without-children'` to show the parent but keep children under drill-down only. |
| `when` | `string` | Visibility / executability expression — see [When Clauses](./when-clauses). |
| `keybindings` | `DevToolsCommandKeybinding[]` | Default keyboard shortcuts. |
| `handler` | `Function` | Server-side handler. Optional if the command only groups children. |
| `children` | `DevToolsServerCommandInput[]` | Static sub-commands (two levels max). |

## Handle

`register()` returns a handle for live updates and unregistration:

```ts
const handle = ctx.commands.register({
  id: 'my-devtool:status',
  title: 'Show Status',
  handler: async () => {},
})

handle.update({ title: 'Show Status (3 items)' })
handle.unregister()
```

## Keybindings

Use `Mod` for platform-aware modifier keys (Cmd on macOS, Ctrl elsewhere):

```ts
ctx.commands.register({
  id: 'my-devtool:open-panel',
  title: 'Open Devtool Panel',
  keybindings: [
    { key: 'Mod+K Mod+D' }, // chord
    { key: 'Alt+D' },
  ],
  handler: async () => openPanel(),
})
```

Users can override keybindings from the settings UI — overrides land in shared state under `commandShortcuts`.

## Sub-Commands

Commands can have static children forming a two-level hierarchy. In the palette, selecting a parent drills into its children:

```ts
ctx.commands.register({
  id: 'my-devtool:routes',
  title: 'Routes',
  icon: 'ph:signpost-duotone',
  children: [
    {
      id: 'my-devtool:routes:rebuild',
      title: 'Rebuild Route Manifest',
      handler: async () => rebuildRoutes(),
    },
    {
      id: 'my-devtool:routes:open',
      title: 'Open Routes File',
      handler: async () => openInEditor('routes.ts'),
    },
  ],
})
```

Children must have globally unique `id`s. The palette flattens them into top-level search results by default; pass `showInPalette: 'without-children'` on the parent to hide children from search.

## When-Clause Gating

Attach a `when` expression to hide / disable commands based on UI state:

```ts
ctx.commands.register({
  id: 'my-devtool:focus-devtool',
  title: 'Focus Devtool Panel',
  when: 'clientType == embedded && !paletteOpen',
  handler: async () => focusPanel(),
})
```

The expression is evaluated at palette-render time and before execution. Full syntax in [When Clauses](./when-clauses).

## Executing Programmatically

Any code with access to the context can trigger a command by id:

```ts
await ctx.commands.execute('my-devtool:clear-cache')

// With arguments:
await ctx.commands.execute('my-devtool:open-file', '/src/main.ts')
```

`execute` throws if the command isn't registered or has no handler.

## Client Commands

Commands registered on the server run in the node process. For actions that must run in the browser (DOM manipulation, copying to clipboard, etc.), register on the client host instead:

```ts
import { connectDevtool } from 'devframe/client'

const rpc = await connectDevtool()

rpc.client.register(/* defineRpcFunction with a mirroring shape */)
```

The command palette merges server and client commands transparently. See [Client](./client) for the full client-side API.

## Listing & Introspection

The host exposes a `list()` method returning serializable command entries (without handlers) — useful when implementing your own palette or exporting the current command set:

```ts
const commands = ctx.commands.list()
for (const cmd of commands) {
  console.log(cmd.id, cmd.title, cmd.keybindings)
}
```

Events let you react to registrations:

```ts
ctx.commands.events.on('command:registered', (cmd) => {
  console.log('new command:', cmd.id)
})
```
