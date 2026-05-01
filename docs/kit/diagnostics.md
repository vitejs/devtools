# Structured Diagnostics

`ctx.diagnostics` is a thin layer over [`logs-sdk`](https://github.com/vercel-labs/logs-sdk) that lets DevTools plugins register their own coded errors and warnings into a shared logger — without taking a direct dependency on `logs-sdk`.

Use it for *author-defined coded diagnostics* (errors, warnings, deprecations) that have a stable code, a documentation URL, and a structured payload. For free-form runtime output that should appear in the DevTools UI, use [`ctx.messages`](./messages) instead.

| Surface | Purpose | Example |
|---------|---------|---------|
| `ctx.diagnostics` | Coded errors and warnings emitted from node-side plugin code | `MYP0001: Plugin foo not configured` |
| [`ctx.messages`](./messages) | Free-form, user-facing notifications shown in the Messages panel | `'Audit complete — 3 issues found'` |

## API Shape

```ts
interface DevToolsDiagnosticsHost {
  /** Combined logs-sdk Logger across all registered diagnostics. */
  readonly logger: Logger

  /** Register additional diagnostic definitions. */
  register: (definitions: DiagnosticsResult) => void

  /** Re-export of logs-sdk's `defineDiagnostics`. */
  defineDiagnostics: typeof defineDiagnostics

  /** Re-export of logs-sdk's `createLogger`. */
  createLogger: typeof createLogger
}
```

The host ships pre-seeded with devframe's own `DF*` codes plus the Vite-specific `DTK*` codes registered by `@vitejs/devtools`. Call `register()` to fold your own definitions in.

## Register Your Own Codes

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
              message: (p: { name: string }) => `Plugin "${p.name}" is not configured`,
              hint: 'Add the plugin to your `vite.config.ts` and pass an options object.',
            },
            MYP0002: {
              message: 'Cache directory missing — running cold.',
              level: 'warn',
            },
          },
        })

        ctx.diagnostics.register(diagnostics)

        // Now you can emit codes through the shared logger:
        ctx.diagnostics.logger.MYP0002().log()
      },
    },
  }
}
```

## Code Prefix Conventions

Use a **4-letter prefix + 4-digit number** for your codes (e.g. `MYP0001`). Pick a prefix that's specific to your plugin — short enough to type, distinctive enough not to collide with other integrations.

Prefixes used by the in-tree packages:

| Prefix | Owner |
|--------|-------|
| `DF` | `devframe` |
| `DTK` | `@vitejs/devtools` |
| `RDDT` | `@vitejs/devtools-rolldown` |
| `VDT` | `@vitejs/devtools-vite` (reserved) |

Each definition supports `message` (string or function), optional `hint`, optional `level` (`'error'` / `'warn'` / `'suggestion'` / `'deprecation'` — defaults to `'error'`), and a `docsBase` for generating documentation URLs.

## Emit a Diagnostic

Each registered code becomes a callable factory on `ctx.diagnostics.logger`. The factory returns an object with `.throw()`, `.warn()`, `.error()`, `.log()`, and `.format()`.

```ts
// Throw — control flow stops here
throw ctx.diagnostics.logger.MYP0001({ name: 'foo' }).throw()

// Log without throwing
ctx.diagnostics.logger.MYP0002().log()

// Override level per call
ctx.diagnostics.logger.MYP0002().warn()

// Attach a `cause`
ctx.diagnostics.logger.MYP0001({ name: 'foo' }, { cause: error }).log()
```

`.throw()` is typed `never`. Prefix the call with `throw` so TypeScript narrows control flow correctly:

```ts
throw ctx.diagnostics.logger.MYP0001({ name }).throw()
```

## Typed Logger Reference

`ctx.diagnostics.logger` is loosely typed — it covers an unbounded set of registered codes, so TypeScript can't narrow them. If you want autocompletion for your plugin's specific codes, keep your own typed reference returned from `createLogger`:

```ts
const myDiagnostics = ctx.diagnostics.defineDiagnostics({
  docsBase: 'https://example.com/errors',
  codes: {
    MYP0001: { message: (p: { name: string }) => `…${p.name}` },
  },
})

// Register so the shared logger can also see it
ctx.diagnostics.register(myDiagnostics)

// Keep a typed reference for your own emit sites
const logger = ctx.diagnostics.createLogger({ diagnostics: [myDiagnostics] })
logger.MYP0001({ name: 'foo' }).warn()
```

Both loggers share the formatter and reporter defaults set by the host (ANSI console output).

## Don't Cache the Combined Logger

`ctx.diagnostics.logger` is a *getter* — it always returns the freshest combined logger, rebuilt each time `register()` is called. Don't cache it across registrations:

```ts
// ❌ Stale after a later register() call
const log = ctx.diagnostics.logger
log.MYP0001({ name: 'foo' }).log()

// ✅ Always fresh
ctx.diagnostics.logger.MYP0001({ name: 'foo' }).log()
```

If you want a stable reference, use the typed `createLogger` form above.

## Document Your Codes

Pair each code with a documentation page so emitted diagnostics carry a clickable URL back to a fix:

```
docs/errors/
  index.md            # Table of all codes
  MYP0001.md          # One page per code
  MYP0002.md
```

Each page covers the message, cause, example, and fix. See any [DTK code page](/errors/) for the canonical template. Setting `docsBase` on `defineDiagnostics({...})` auto-attaches the URL to every emitted diagnostic.

## When to Use What

- **`ctx.diagnostics`** — Coded conditions you want users (or other tools) to be able to look up: misconfiguration, deprecations, validation failures, internal invariants. Always have a docs page. Often `.throw()`.
- **[`ctx.messages`](./messages)** — User-facing activity surfaces in the DevTools UI: progress indicators, audit results, "URL copied" toasts. No code, no docs URL — just a message and a level.

The two systems are intentionally separate: diagnostics are for tool authors and CI; messages are for the human in front of the DevTools panel.
