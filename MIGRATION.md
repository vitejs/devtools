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
