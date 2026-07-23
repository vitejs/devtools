# Migration Guide

## 0.2 → 0.3 (devframe 0.5.x + `@devframes/hub`)

`@vitejs/devtools-kit` now thins onto [`@devframes/hub`](https://www.npmjs.com/package/@devframes/hub) for the hub primitives (docks, terminals, messages, commands, `mountDevframe`, json-render factory). The kit's public `DevTools*` surface stays in place via re-export aliases — most plugin authors don't need to change anything.

### What changes for plugin authors

- **Nothing at the import level.** `DevToolsRpcClient`, `DevToolsDockEntry`, `DevToolsNodeContext`, `PluginWithDevTools`, `defineRpcFunction`, `getDevToolsRpcClient`, `connectRemoteDevTools`, the `DEVTOOLS_MOUNT_PATH` constant — all keep their `@vitejs/devtools-kit` import paths and identifier names.
- **One-time re-auth.** The anonymous-auth RPC scope moved from `vite:anonymous:` to `devframe:anonymous:` and the WebSocket auth-token query parameter from `vite_devtools_auth_token` to `devframe_auth_token` (both following devframe's internal rename). Auth tokens stored by older clients become invalid — users re-authorize once on first connect after upgrading.
- **`DTK0050`–`DTK0057` retire.** These dock/terminal/command diagnostic codes now ship from `@devframes/hub` as `DF8100`–`DF8403`. Error messages and docs URLs change accordingly; the conditions that trigger them are unchanged.

### What stays the same

- The Vite DevTools SPA continues to serve at **`/__devtools/`**. The kit pins this mount path independently of devframe's new `/__devframe/` default.
- `viteplus` remains a valid dock category.
- `vite:open-in-editor` and `vite:open-in-finder` server commands keep their existing IDs.

### If you import from `devframe` directly

The `devframe/node/internal` subpath was renamed to `devframe/node/hub-internals` in devframe v0.5.x. Update direct imports:

```diff
- import { getInternalContext } from 'devframe/node/internal'
+ import { getInternalContext } from 'devframe/node/hub-internals'
```

And the type rename:

```diff
- import type { DevToolsInternalContext } from 'devframe/node/internal'
+ import type { DevframeInternalContext } from 'devframe/node/hub-internals'
```

Inside the kit's own re-export (`@vitejs/devtools/internal`), the alias `DevToolsInternalContext` remains.

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
