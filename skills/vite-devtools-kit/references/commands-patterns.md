# Commands & Command Palette

Register executable commands discoverable through a built-in palette with keyboard shortcuts.

## Defining Commands

```ts
import { defineCommand } from '@vitejs/devtools-kit'

const clearCache = defineCommand({
  id: 'my-plugin:clear-cache',
  title: 'Clear Build Cache',
  description: 'Remove all cached build artifacts',
  icon: 'ph:trash-duotone',
  category: 'tools',
  handler: async () => {
    await fs.rm('.cache', { recursive: true })
  },
})

// Register in plugin setup
ctx.commands.register(clearCache)
```

## Command Options

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | **Required.** Unique namespaced ID (e.g. `my-plugin:action`) |
| `title` | `string` | **Required.** Human-readable title shown in the palette |
| `description` | `string` | Optional description text |
| `icon` | `string` | Iconify icon string (e.g. `ph:trash-duotone`) |
| `category` | `string` | Category for grouping |
| `showInPalette` | `boolean \| 'without-children'` | Whether to show in command palette (default: `true`). `'without-children'` shows the command but doesn't flatten children into search — only accessible via drill-down. |
| `when` | `string` | Conditional visibility expression — see [When Clauses](./when-clauses.md) |
| `keybindings` | `DevToolsCommandKeybinding[]` | Default keyboard shortcuts |
| `handler` | `Function` | Server-side handler. Optional if the command is a group for children. |
| `children` | `DevToolsServerCommandInput[]` | Static sub-commands (two levels max) |

## Command Handle

`register()` returns a handle for live updates:

```ts
const handle = ctx.commands.register({
  id: 'my-plugin:status',
  title: 'Show Status',
  handler: () => { /* ... */ },
})

// Update later
handle.update({ title: 'Show Status (3 items)' })

// Remove
handle.unregister()
```

## Sub-Commands

Two-level hierarchy. Selecting a parent in the palette drills down into its children.

```ts
ctx.commands.register({
  id: 'git',
  title: 'Git',
  icon: 'ph:git-branch-duotone',
  category: 'tools',
  // No handler — group-only parent
  children: [
    {
      id: 'git:commit',
      title: 'Commit',
      icon: 'ph:check-duotone',
      keybindings: [{ key: 'Mod+Shift+G' }],
      handler: async () => { /* ... */ },
    },
    {
      id: 'git:push',
      title: 'Push',
      handler: async () => { /* ... */ },
    },
  ],
})
```

Each child must have a globally unique `id`. Use the pattern `parentId:childAction` (e.g. `git:commit`).

Sub-commands with keybindings can be executed directly via the shortcut without opening the palette.

## Keyboard Shortcuts

### Key Format

Use `Mod` as a platform-aware modifier — maps to `Cmd` on macOS and `Ctrl` on other platforms.

| Key string | macOS | Windows/Linux |
|------------|-------|---------------|
| `Mod+K` | `Cmd+K` | `Ctrl+K` |
| `Mod+Shift+P` | `Cmd+Shift+P` | `Ctrl+Shift+P` |
| `Alt+N` | `Option+N` | `Alt+N` |

```ts
ctx.commands.register(defineCommand({
  id: 'my-plugin:toggle-overlay',
  title: 'Toggle Overlay',
  keybindings: [{ key: 'Mod+Shift+O' }],
  handler: () => { /* ... */ },
}))
```

### User Overrides

Users can customize shortcuts in Settings > **Keyboard Shortcuts**. Overrides persist across sessions. Setting an empty array disables a shortcut.

The shortcut editor includes:
- **Key capture** — click the input and press any key combination
- **Modifier toggles** — toggle Cmd/Ctrl, Alt, Shift individually
- **Conflict detection** — warns on browser shortcut conflicts, duplicate bindings, and weak shortcuts (single key without modifiers)

`KNOWN_BROWSER_SHORTCUTS` is exported from `@vitejs/devtools-kit` and maps key combinations to human-readable descriptions.

## Conditional Visibility

Commands support a `when` expression for conditional visibility:

```ts
ctx.commands.register(defineCommand({
  id: 'my-plugin:embedded-only',
  title: 'Embedded-Only Action',
  when: 'clientType == embedded',
  handler: async () => { /* ... */ },
}))
```

When set, the command only appears in the palette and is only triggerable via shortcuts when the expression evaluates to `true`.

See [When Clauses](./when-clauses.md) for full syntax reference and context variables.

## Client-Side Commands

Client commands register in the webcomponent context and execute directly in the browser:

```ts
context.commands.register({
  id: 'devtools:theme',
  source: 'client',
  title: 'Theme',
  icon: 'ph:palette-duotone',
  children: [
    {
      id: 'devtools:theme:light',
      source: 'client',
      title: 'Light',
      action: () => setTheme('light'),
    },
    {
      id: 'devtools:theme:dark',
      source: 'client',
      title: 'Dark',
      action: () => setTheme('dark'),
    },
  ],
})
```

Client commands can return dynamic sub-items:

```ts
context.commands.register({
  id: 'devtools:docs',
  source: 'client',
  title: 'Documentation',
  action: async () => {
    const docs = await fetchDocs()
    return docs.map(doc => ({
      id: `docs:${doc.slug}`,
      source: 'client' as const,
      title: doc.title,
      action: () => window.open(doc.url, '_blank'),
    }))
  },
})
```

## Command Palette

Built-in palette toggled with `Mod+K`. Features:

- **Fuzzy search** across all registered commands (including sub-commands)
- **Keyboard navigation** — Arrow keys, Enter to select, Escape to close
- **Drill-down** — Commands with children show breadcrumb navigation
- **Server command execution** — via RPC with loading indicator
- **Dynamic sub-menus** — Client commands can return sub-items at runtime

## Complete Example

```ts
/// <reference types="@vitejs/devtools-kit" />
import type { Plugin } from 'vite'
import { defineCommand } from '@vitejs/devtools-kit'

export default function myPlugin(): Plugin {
  return {
    name: 'my-plugin',

    devtools: {
      setup(ctx) {
        // Simple command with keybinding
        ctx.commands.register(defineCommand({
          id: 'my-plugin:restart',
          title: 'Restart Dev Server',
          icon: 'ph:arrow-clockwise-duotone',
          keybindings: [{ key: 'Mod+Shift+R' }],
          handler: async () => {
            await ctx.viteServer?.restart()
          },
        }))

        // Command group with sub-commands
        ctx.commands.register(defineCommand({
          id: 'my-plugin:cache',
          title: 'Cache',
          icon: 'ph:database-duotone',
          children: [
            {
              id: 'my-plugin:cache:clear',
              title: 'Clear Cache',
              handler: async () => { /* ... */ },
            },
            {
              id: 'my-plugin:cache:inspect',
              title: 'Inspect Cache',
              handler: async () => { /* ... */ },
            },
          ],
        }))
      },
    },
  }
}
```
