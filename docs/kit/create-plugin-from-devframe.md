---
outline: deep
---

# Create Plugin from Devframe

A [Devframe definition](https://devfra.me/guide/devframe-definition) is a portable devtool — the same definition runs standalone, as a CLI, through a coding agent, or inside any host framework. `createPluginFromDevframe` is the bridge that mounts one as a Vite plugin inside Vite DevTools.

```ts
// vite.config.ts
import { createPluginFromDevframe } from '@vitejs/devtools-kit/node'
import devtool from './my-devtool'

export default {
  plugins: [createPluginFromDevframe(devtool)],
}
```

In its `devtools.setup`, the plugin mounts the devframe's SPA, registers an iframe dock entry synthesized from the definition's `id` / `name` / `icon` / `basePath`, and runs the devframe's own `setup(ctx)`. You author the tool once with Devframe; Kit handles the Vite wiring.

## Options

```ts
createPluginFromDevframe(devtool, {
  // Vite plugin name. Defaults to `devframe:${d.id}`.
  name: 'my-devtool',

  // Mount path. Defaults to `d.basePath` or `/__${d.id}/`.
  base: '/__my-devtool/',

  // Customize the auto-synthesized iframe dock entry — category, icon
  // override, `when` visibility, etc. `id`, `type`, and `url` stay derived.
  dock: { category: 'app' },

  // Kit-only setup, run after the devframe's own setup and after the dock
  // entry is registered. Use it for hub features that should not live in the
  // portable definition — commands, terminals, extra dock entries.
  setup(ctx) {
    ctx.commands.register({
      id: 'my-devtool:clear-cache',
      title: 'Clear Cache',
      handler: () => { /* ... */ },
    })
  },
})
```

Keep the portable definition free of Vite assumptions: anything that needs the hub belongs in `opts.setup`, not in the devframe's own `setup`. See [Devframe adapters](https://devfra.me/adapters) for the other ways a definition can be deployed.
