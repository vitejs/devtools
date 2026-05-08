---
outline: deep
---

# Structured Diagnostics

`ctx.diagnostics` is a thin layer over [`logs-sdk`](https://github.com/vercel-labs/logs-sdk) that lets integrations register coded errors and warnings into a shared logger without depending on `logs-sdk` directly. Use it for author-defined coded diagnostics — errors, warnings, deprecations — with a stable code, a documentation URL, and a structured payload. For free-form runtime output that should appear in the DevTools UI, use [`ctx.messages`](https://devtools.vite.dev/kit/messages).

| Surface | Purpose | Example |
|---------|---------|---------|
| `ctx.diagnostics` | Coded errors and warnings emitted from node-side plugin code | `MYP0001: Plugin foo not configured` |
| [`ctx.messages`](https://devtools.vite.dev/kit/messages) | Free-form, user-facing notifications shown in the Messages panel | `'Audit complete — 3 issues found'` |

## Shape

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

The host ships pre-seeded with devframe's own `DF*` codes, plus the host package's codes (`DTK*` for `@vitejs/devtools`, etc.). Call `register()` to add your own.

## Register your own codes

```ts
export function MyPlugin(): PluginWithDevTools {
  return {
    name: 'my-plugin',
    devtools: {
      setup(ctx) {
        const myDiagnostics = ctx.diagnostics.defineDiagnostics({
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

        ctx.diagnostics.register(myDiagnostics)

        // Now you can emit codes through the shared logger:
        ctx.diagnostics.logger.MYP0002().log()
      },
    },
  }
}
```

## Code conventions

Codes are 4-letter prefix + 4-digit number (e.g. `MYP0001`). Pick a prefix specific to your plugin or tool — short enough to type, distinctive enough to avoid collisions with other integrations.

Prefixes already in use in this monorepo:

| Prefix | Owner |
|--------|-------|
| `DF` | `devframe` |
| `DTK` | `@vitejs/devtools` (Vite-specific) |
| `RDDT` | `@vitejs/devtools-rolldown` |
| `VDT` | `@vitejs/devtools-vite` (reserved) |

Each definition supports a `message` (string or function), an optional `hint`, an optional `level` (`'error'` / `'warn'` / `'suggestion'` / `'deprecation'` — defaults to `'error'`), and a `docsBase` for generating documentation URLs. See [`logs-sdk`](https://github.com/vercel-labs/logs-sdk) for the full schema.

## Emit a diagnostic

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

`.throw()` is typed `never`, so TypeScript treats the line after as unreachable. Prefix the call with `throw` for control-flow narrowing:

```ts
throw ctx.diagnostics.logger.MYP0001({ name }).throw()
```

## Typed logger reference

`ctx.diagnostics.logger` is loosely typed — it covers an unbounded set of registered codes, beyond what TypeScript can narrow. For autocompletion on your plugin's specific codes, keep a typed reference returned from `createLogger`:

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

## Updating the combined logger

`ctx.diagnostics.logger` is a getter — it returns the freshest combined logger, rebuilt each time `register()` is called. Don't cache it:

```ts
// ❌ Stale after a later register() call
const log = ctx.diagnostics.logger
log.MYP0001({ name: 'foo' }).log()

// ✅ Always fresh
ctx.diagnostics.logger.MYP0001({ name: 'foo' }).log()
```

For a stable reference, use `ctx.diagnostics.createLogger({ diagnostics: [myDiagnostics] })` — that one stays bound to your definitions.

## Document your codes

Pair each code with a documentation page. devframe and the published Vite DevTools packages follow this layout:

```
docs/errors/
  index.md            # Table of all codes
  MYP0001.md          # One page per code
  MYP0002.md
```

Each page covers the message, cause, example, and fix — see any [DF code page](https://devfra.me/errors/) for the canonical template. Setting `docsBase` on `defineDiagnostics({...})` auto-attaches the URL to every emitted diagnostic.

## When to use what

- **`ctx.diagnostics`** — coded conditions worth looking up: misconfiguration, deprecations, validation failures, internal invariants. Always docs-backed. Often `.throw()`.
- **`ctx.messages`** — user-facing activity surfaces in the DevTools UI: progress indicators, audit results, "URL copied" toasts. Just a message and a level.

Diagnostics target tool authors and CI; messages target the human in front of the DevTools panel.
