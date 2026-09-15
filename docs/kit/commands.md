---
outline: deep
---

# Commands

Commands are executable actions plugins register on the server or client. Users discover and run them through the built-in command palette and can rebind their keyboard shortcuts. The palette merges commands from every integration.

Commands are a hub concept shared across host frameworks — see the [Devframe hub docs](https://devfra.me/guide/hub) for the full model. This page shows registering them from a Vite plugin.

## Server commands

Define with `defineCommand` and register in `devtools.setup`:

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

const plugin: Plugin = {
  devtools: {
    setup(ctx) {
      ctx.commands.register(clearCache)
    },
  },
}
```

Server command handlers run on the Node side; the palette bridges the selection to an RPC call.

## Client commands

Register client-side actions on the [client context](./client-context) — they run directly in the browser:

```ts
const ctx = getDevToolsClientContext()!

ctx.commands.register({
  id: 'my-plugin:toggle-grid',
  title: 'Toggle Layout Grid',
  handler: () => document.body.classList.toggle('debug-grid'),
})
```

Bind a keybinding, gate visibility with a [when clause](https://devfra.me/references/when-clauses), or nest children through the same definition — see the hub docs for those fields.
