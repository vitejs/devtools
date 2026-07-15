# Structured Diagnostics

`ctx.diagnostics` is a thin layer over [`nostics`](https://github.com/vercel-labs/nostics) that lets DevTools plugins register coded errors and warnings into a shared registry without depending on `nostics` directly. Use it for author-defined coded diagnostics — errors, warnings, deprecations — that carry a stable code, a documentation URL, and a structured payload. For free-form runtime output that should appear in the DevTools UI, use [`ctx.messages`](./messages).

| Surface | Purpose | Example |
|---------|---------|---------|
| `ctx.diagnostics` | Coded errors and warnings emitted from node-side plugin code | `MYP0001: Plugin foo not configured` |
| [`ctx.messages`](./messages) | Free-form, user-facing notifications shown in the Messages panel | `'Audit complete — 3 issues found'` |

## API shape

```ts
interface DevToolsDiagnosticsHost {
  /**
   * Proxy-backed lookup of every registered code by name. Each entry is a
   * `nostics` `DiagnosticHandle` — a callable that builds a diagnostic and
   * routes it through registered reporters; prefix with `throw` to raise.
   */
  readonly logger: Record<string, any>

  /** Register additional diagnostic definitions. */
  register: (definitions: Record<string, unknown>) => void

  /**
   * Mirror of `nostics`'s `defineDiagnostics`, pre-wired with the host's
   * ANSI console reporter — plugins typically omit `reporters`.
   */
  defineDiagnostics: typeof defineDiagnostics
}
```

The host ships pre-seeded with devframe's own `DF*` codes plus the Vite-specific `DTK*` codes registered by `@vitejs/devtools`. Call `register()` to fold your own definitions in.

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

        // Emit codes through the shared lookup:
        ctx.diagnostics.logger.MYP0002()
      },
    },
  }
}
```

## Code prefix conventions

Codes are 4-letter prefix + 4-digit number (e.g. `MYP0001`). Pick a prefix specific to your plugin — short enough to type, distinctive enough to avoid collisions with other integrations.

Prefixes used by the in-tree packages:

| Prefix | Owner |
|--------|-------|
| `DF` | `devframe` |
| `DTK` | `@vitejs/devtools` |
| `RDDT` | `@vitejs/devtools-rolldown` |
| `VDT` | `@vitejs/devtools-vite` |

Each definition supports `why` (string or function returning a string) and an optional `fix` (string or function). A `docsBase` on the definition group auto-attaches a per-code URL to every emitted diagnostic.

## Emit a diagnostic

Each registered code is reachable as a property on `ctx.diagnostics.logger`. Every handle is a callable — invoke it to report (returns the `Diagnostic`), or prefix with `throw` to raise.

```ts
// Throw — control flow stops here
throw ctx.diagnostics.logger.MYP0001({ name: 'foo' })

// Report without throwing (default console method: `warn`)
ctx.diagnostics.logger.MYP0002()

// Override the console method per call
ctx.diagnostics.logger.MYP0002({}, { method: 'error' })

// Attach a `cause` via the params object
ctx.diagnostics.logger.MYP0001({ name: 'foo', cause: error })
```

The callable returns a `Diagnostic` (which extends `Error`). Prefix with `throw` so TypeScript narrows the lines after as unreachable:

```ts
throw ctx.diagnostics.logger.MYP0001({ name })
```

## Typed handle reference

`ctx.diagnostics.logger` is a loosely typed proxy — it covers an unbounded set of registered codes, beyond what TypeScript can narrow. For autocompletion on your plugin's specific codes, keep a reference to the typed handle returned by `defineDiagnostics()`:

```ts
const myDiagnostics = ctx.diagnostics.defineDiagnostics({
  docsBase: 'https://example.com/errors',
  codes: {
    MYP0001: { why: (p: { name: string }) => `…${p.name}` },
  },
})

// Register so the shared lookup can also see it
ctx.diagnostics.register(myDiagnostics)

// Use the typed handle directly at emit sites
myDiagnostics.MYP0001({ name: 'foo' })
```

Both paths share the formatter and reporter defaults set by the host (ANSI console output).

## Document your codes

Pair each code with a documentation page so emitted diagnostics carry a clickable URL back to a fix:

```
docs/errors/
  index.md            # Table of all codes
  MYP0001.md          # One page per code
  MYP0002.md
```

Each page covers the message, cause, example, and fix; see any [DTK code page](/errors/) for the canonical template. Setting `docsBase` on `defineDiagnostics({...})` auto-attaches the URL to every emitted diagnostic.

## When to use what

- **`ctx.diagnostics`** — coded conditions worth looking up: misconfiguration, deprecations, validation failures, internal invariants. Always docs-backed. Often `throw`-prefixed.
- **[`ctx.messages`](./messages)** — user-facing activity surfaces in the DevTools UI: progress indicators, audit results, "URL copied" toasts. Just a message and a level.

Diagnostics target tool authors and CI; messages target the human in front of the DevTools panel.
