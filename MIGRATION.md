# Migration Guide

## 0.1 → 0.2

### `@vitejs/devtools-kit`

The deprecated aliases introduced in 0.1 have been removed. Update imports and references as follows.

#### Message types

The `DevToolsLog*` types were renamed to `DevToolsMessage*` in 0.1. The old names are now gone.

| Removed | Replacement |
| --- | --- |
| `DevToolsLogLevel` | `DevToolsMessageLevel` |
| `DevToolsLogEntryFrom` | `DevToolsMessageEntryFrom` |
| `DevToolsLogElementPosition` | `DevToolsMessageElementPosition` |
| `DevToolsLogFilePosition` | `DevToolsMessageFilePosition` |
| `DevToolsLogEntry` | `DevToolsMessageEntry` |
| `DevToolsLogEntryInput` | `DevToolsMessageEntryInput` |
| `DevToolsLogHandle` | `DevToolsMessageHandle` |
| `DevToolsLogsClient` | `DevToolsMessagesClient` |
| `DevToolsLogsHost` | `DevToolsMessagesHost` |

#### Node context type

```diff
- import type { DevToolsNodeContext } from '@vitejs/devtools-kit'
+ import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
```

The framework-neutral `DevToolsNodeContext` still lives upstream at `devframe/types` and is unchanged.

#### Dock client script context

```diff
  defineDockClientScript((ctx) => {
-   ctx.logs.add({ ... })
+   ctx.messages.add({ ... })
  })
```

#### `WhenContext` / `WhenExpression`

These types are no longer re-exported from `@vitejs/devtools-kit`. Import them from devframe:

```diff
- import type { WhenContext, WhenExpression } from '@vitejs/devtools-kit'
+ import type { WhenContext, WhenExpression } from 'devframe/utils/when'
```

The `@vitejs/devtools-kit/utils/when` subpath remains and re-exports these types alongside `evaluateWhen` and `resolveContextValue`.

#### Diagnostic handles are callable

`nostics` 0.2 (pulled in via devframe 0.4) drops the `.report()` / `.throw()` methods on diagnostic handles. Each handle is now a callable that builds and emits a diagnostic; prefix with `throw` to raise.

```diff
- throw ctx.diagnostics.logger.MYP0001.throw({ name })
+ throw ctx.diagnostics.logger.MYP0001({ name })

- ctx.diagnostics.logger.MYP0002.report()
+ ctx.diagnostics.logger.MYP0002()

- ctx.diagnostics.logger.MYP0002.report({ name }, { method: 'error' })
+ ctx.diagnostics.logger.MYP0002({ name }, { method: 'error' })
```

The payload shape (including `cause`) and the optional reporter-options second argument are unchanged. Apply the same rewrite to typed handles returned from `ctx.diagnostics.defineDiagnostics()`.
