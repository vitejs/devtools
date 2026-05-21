# Structured Diagnostics Patterns

`ctx.diagnostics` exposes a shared [`nostics`](https://github.com/vercel-labs/nostics) registry and lets plugins register their own coded errors / warnings without depending on `nostics` directly. Use it for *author-defined coded conditions* with a stable code and a docs URL — distinct from `ctx.messages`, which is for free-form user-facing notifications shown in the DevTools UI.

## API Surface

```ts
interface DevToolsDiagnosticsHost {
  /** Proxy-backed lookup of every registered code by name. Each entry is a
   * `nostics` `DiagnosticHandle` — a callable that builds a diagnostic and
   * routes it through registered reporters; prefix with `throw` to raise.
   * Loosely typed because it spans heterogeneous definitions from different
   * integrations. */
  readonly logger: Record<string, any>

  /** Register additional diagnostic definitions with the host. */
  register: (definitions: Record<string, unknown>) => void

  /** Mirror of `nostics`'s `defineDiagnostics`, pre-wired with the host's
   * ANSI console reporter. Plugins typically omit `reporters`. */
  defineDiagnostics: typeof defineDiagnostics
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
      why: 'Static string message',
      // OR a template function:
      // why: (p: { name: string }) => `Plugin "${p.name}" failed`,
      fix: 'Optional secondary remediation guidance — shown after the message.',
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
              why: (p: { name: string }) => `Plugin "${p.name}" is not configured`,
              fix: 'Pass an options object to the plugin in `vite.config.ts`.',
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

## Emit a Diagnostic

Each registered code is reachable as a property on `ctx.diagnostics.logger`. Every handle is a callable — invoke it to report (returns the `Diagnostic`), or prefix with `throw` to raise.

```ts
// Throw — control flow stops here. Prefix with `throw` for TS narrowing.
throw ctx.diagnostics.logger.MYP0001({ name: 'foo' })

// Report without throwing (default console method: `warn`)
ctx.diagnostics.logger.MYP0002()

// Override the console method per call
ctx.diagnostics.logger.MYP0002({}, { method: 'error' })

// Attach a cause via the params object
ctx.diagnostics.logger.MYP0001({ name, cause: error })
```

## Loosely Typed `logger` vs Typed Handle

`ctx.diagnostics.logger` is a proxy covering an unbounded set of registered codes, so TypeScript can't narrow them. For full autocompletion, keep your own reference to the typed handle returned from `defineDiagnostics()`:

```ts
const diagnostics = ctx.diagnostics.defineDiagnostics({ /* ... */ })

// Register so the shared lookup sees it too
ctx.diagnostics.register(diagnostics)

// Typed handle — autocompletes MYP* codes
diagnostics.MYP0001({ name: 'foo' })
```

Both paths share the host's default formatter (ANSI) and reporter (console).

## Anti-Patterns

```ts
// ❌ Raw throw with an ad-hoc string
throw new Error('Plugin foo not configured')

// ✅ Use a structured code
throw ctx.diagnostics.logger.MYP0001({ name: 'foo' })
```

```ts
// ❌ Using ctx.messages for things that need a code / docs URL
ctx.messages.add({ message: 'Plugin failed: bad config', level: 'error' })

// ✅ Use ctx.diagnostics for coded conditions; ctx.messages for UI activity
ctx.diagnostics.logger.MYP0001({ name })
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

- **`ctx.diagnostics`** — Coded errors / warnings with a stable code and docs URL. Misconfiguration, deprecation, validation failures, internal invariants. Often `throw`-prefixed.
- **`ctx.messages`** — Free-form user-facing notifications surfaced in the DevTools Messages panel and as toasts. Progress indicators, audit results, transient status. No code, no docs URL.

## Real-World Examples

- `devframe/packages/devframe/src/node/diagnostics.ts` — `DF*` codes (devframe internals)
- `packages/core/src/node/diagnostics.ts` — `DTK*` codes (Vite-specific)
- `packages/rolldown/src/node/diagnostics.ts` — `RDDT*` codes (rolldown UI)

Each defines a `diagnostics` object via `defineDiagnostics(...)` and either uses its own typed handle directly, or — in plugin setup — calls `ctx.diagnostics.register(diagnostics)` to fold the codes into the shared host lookup.
