---
outline: deep
---

# Structured Diagnostics

`ctx.diagnostics` lets a plugin register coded errors and warnings — each with a stable code, a docs URL, and a structured payload — into a shared registry. It's a thin layer over [`nostics`](https://github.com/vercel-labs/nostics), so plugins get coded diagnostics without depending on `nostics` directly.

Use it for author-defined codes (`MYP0001: Plugin not configured`). For free-form runtime output shown in the UI, use [Messages](./messages). The mechanics are documented in the [Devframe diagnostics guide](https://devfra.me/guide/diagnostics).

## Register your own codes

```ts
import type { PluginWithDevTools } from '@vitejs/devtools-kit'

export function MyPlugin(): PluginWithDevTools {
  return {
    name: 'vite-plugin-my-tool',
    devtools: {
      setup(ctx) {
        const diagnostics = ctx.diagnostics.defineDiagnostics({
          docsBase: 'https://example.com/errors',
          codes: {
            MYP0001: {
              why: (p: { name: string }) => `Plugin "${p.name}" is not configured`,
              fix: 'Add the plugin to your `vite.config.ts` and pass an options object.',
            },
            MYP0002: {
              why: 'Cache directory missing — running cold.',
            },
          },
        })

        ctx.diagnostics.register(diagnostics)
      },
    },
  }
}
```

## Emit

Each registered code is a callable on `ctx.diagnostics.logger`. Prefix with `throw` to raise it, or call it to report (defaults to `console.warn`):

```ts
ctx.diagnostics.logger.MYP0002() // reported
throw ctx.diagnostics.logger.MYP0001({ name: 'foo' }) // thrown
```

The registry ships pre-seeded with devframe's `DF*` codes and the Vite-specific `DTK*` codes. Vite DevTools' own codes are catalogued in the [Error Reference](/errors/).
