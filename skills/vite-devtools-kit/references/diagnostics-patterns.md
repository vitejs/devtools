# Structured Diagnostics Patterns

`ctx.diagnostics` exposes a shared [`logs-sdk`](https://github.com/vercel-labs/logs-sdk) logger and lets plugins register their own coded errors / warnings without depending on `logs-sdk` directly. Use it for *author-defined coded conditions* with a stable code and a docs URL — distinct from `ctx.messages`, which is for free-form user-facing notifications shown in the DevTools UI.

## API Surface

```ts
interface DevToolsDiagnosticsHost {
  /** Combined logs-sdk Logger across all registered diagnostics. Always returns the freshest logger — rebuilt on each `register()`. */
  readonly logger: Logger

  /** Register additional diagnostic definitions with the host. */
  register: (definitions: DiagnosticsResult) => void

  /** Re-export of logs-sdk's `defineDiagnostics`. */
  defineDiagnostics: typeof defineDiagnostics

  /** Re-export of logs-sdk's `createLogger`. */
  createLogger: typeof createLogger
}
```

The host comes pre-seeded with devframe's `DF*` codes and the host package's codes (`DTK*` for `@vitejs/devtools`).

## Code Prefix Conventions

| Prefix | Format | Reserved for |
|--------|--------|--------------|
| `DF` | 4-digit number | `devframe` |
| `DTK` | 4-digit number | `@vitejs/devtools` |
| `RDDT` | 4-digit number | `@vitejs/devtools-rolldown` |
| `VDT` | 4-digit number | `@vitejs/devtools-vite` (reserved) |

Plugins should pick their own 3–5 letter prefix (e.g. `MYP`, `A11Y`, `LINT`) — short, distinctive, and unlikely to collide.

## Diagnostic Definition Shape

```ts
ctx.diagnostics.defineDiagnostics({
  // Auto-attaches `<docsBase>/<code lowercased>` to each emitted diagnostic
  docsBase: 'https://example.com/errors',
  codes: {
    MYP0001: {
      message: 'Static string message',
      // OR a template function:
      // message: (p: { name: string }) => `Plugin "${p.name}" failed`,
      hint: 'Optional secondary guidance — shown after the message.',
      level: 'warn', // 'error' (default) | 'warn' | 'suggestion' | 'deprecation'
    },
  },
})
```

## Register in Plugin Setup

```ts
import type { PluginWithDevTools } from '@vitejs/devtools-kit'

export function MyPlugin(): PluginWithDevTools {
  return {
    name: 'my-plugin',
    devtools: {
      setup(ctx) {
        const diagnostics = ctx.diagnostics.defineDiagnostics({
          docsBase: 'https://my-plugin.dev/errors',
          codes: {
            MYP0001: {
              message: (p: { name: string }) => `Plugin "${p.name}" is not configured`,
              hint: 'Pass an options object to the plugin in `vite.config.ts`.',
            },
            MYP0002: {
              message: 'Cache directory missing — running cold.',
              level: 'warn',
            },
          },
        })
        ctx.diagnostics.register(diagnostics)
      },
    },
  }
}
```

## Emit a Diagnostic

Each code becomes a callable factory on `ctx.diagnostics.logger`. Each call returns an object with `.throw()`, `.warn()`, `.error()`, `.log()`, and `.format()`.

```ts
// Throw — control flow stops here. Prefix with `throw` for TS narrowing.
throw ctx.diagnostics.logger.MYP0001({ name: 'foo' }).throw()

// Log without throwing
ctx.diagnostics.logger.MYP0002().log()

// Override level per call
ctx.diagnostics.logger.MYP0002().warn()

// Attach a cause
ctx.diagnostics.logger.MYP0001({ name }, { cause: error }).log()
```

## Loosely Typed `logger` vs Typed Reference

`ctx.diagnostics.logger` covers an unbounded set of registered codes, so TypeScript can't narrow them. For full autocompletion, keep your own typed reference via `createLogger`:

```ts
const diagnostics = ctx.diagnostics.defineDiagnostics({ /* ... */ })

// Register so the shared logger sees it too
ctx.diagnostics.register(diagnostics)

// Typed reference — autocompletes MYP* codes
const logger = ctx.diagnostics.createLogger({ diagnostics: [diagnostics] })
logger.MYP0001({ name: 'foo' }).warn()
```

Both loggers share the host's default formatter (ANSI) and reporter (console).

## Anti-Patterns

```ts
// ❌ Caching the getter — stale after a later register() call
const log = ctx.diagnostics.logger
log.MYP0001({ name: 'foo' }).log()

// ✅ Always go through the getter
ctx.diagnostics.logger.MYP0001({ name: 'foo' }).log()
```

```ts
// ❌ Using a raw throw with an ad-hoc string
throw new Error('Plugin foo not configured')

// ✅ Use a structured code
throw ctx.diagnostics.logger.MYP0001({ name: 'foo' }).throw()
```

```ts
// ❌ Using ctx.messages for things that need a code / docs URL
ctx.messages.add({ message: 'Plugin failed: bad config', level: 'error' })

// ✅ Use ctx.diagnostics for coded conditions; ctx.messages for UI activity
ctx.diagnostics.logger.MYP0001({ name }).log()
```

## Document Your Codes

Pair each code with a docs page. The convention used by the in-tree packages is one Markdown file per code:

```
docs/errors/
  index.md            # Table of all codes
  MYP0001.md          # One page per code
```

Each page covers: message, cause, example trigger, and fix. The `docsBase` you set on `defineDiagnostics({...})` is auto-appended with the lowercase code, so users get a clickable URL on every emitted diagnostic.

## When to Use What

- **`ctx.diagnostics`** — Coded errors / warnings with a stable code and docs URL. Misconfiguration, deprecation, validation failures, internal invariants. Often paired with `.throw()`.
- **`ctx.messages`** — Free-form user-facing notifications surfaced in the DevTools Messages panel and as toasts. Progress indicators, audit results, transient status. No code, no docs URL.

## Real-World Examples

- `devframe/packages/devframe/src/node/diagnostics.ts` — `DF*` codes (devframe internals)
- `packages/core/src/node/diagnostics.ts` — `DTK*` codes (Vite-specific)
- `packages/rolldown/src/node/diagnostics.ts` — `RDDT*` codes (rolldown UI)

Each defines a `diagnostics` object via `defineDiagnostics(...)` and either keeps its own `createLogger`-built `logger` or — in plugin setup — calls `ctx.diagnostics.register(diagnostics)` to fold the codes into the shared host logger.
