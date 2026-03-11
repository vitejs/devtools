# Logs

The Logs system allows plugins to emit structured log entries from both the server (Node.js) and client (browser) contexts. Logs are displayed in the built-in **Logs** panel in the DevTools dock, and can optionally appear as toast notifications.

## Use Cases

- **Accessibility audits** — Run axe or similar tools on the client side, report warnings with element positions and autofix suggestions
- **Runtime errors** — Capture and display errors with stack traces
- **Linting & testing** — Run ESLint or test runners alongside the dev server and surface results with file positions
- **Notifications** — Short-lived messages like "URL copied" that auto-dismiss

## Log Entry Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | `string` | Yes | Short title or summary |
| `level` | `'info' \| 'warn' \| 'error' \| 'success' \| 'debug'` | Yes | Severity level, determines color and icon |
| `description` | `string` | No | Detailed description or explanation |
| `stacktrace` | `string` | No | Stack trace string |
| `filePosition` | `{ file, line?, column? }` | No | Source file location (clickable in the panel) |
| `elementPosition` | `{ selector?, boundingBox?, description? }` | No | DOM element position info |
| `autofix` | `{ type: 'rpc', name: string } \| Function` | No | Autofix action |
| `notify` | `boolean` | No | Show as a toast notification |
| `category` | `string` | No | Grouping category (e.g., `'a11y'`, `'lint'`) |
| `labels` | `string[]` | No | Tags for filtering |
| `autoDismiss` | `number` | No | Time in ms to auto-dismiss the toast (default: 5000) |
| `autoDelete` | `number` | No | Time in ms to auto-delete the log entry |
| `status` | `'loading' \| 'idle'` | No | Status indicator (shows spinner when `'loading'`) |
| `id` | `string` | No | Explicit id for deduplication — re-adding with the same id updates the existing entry |

## Server-Side Usage

In your plugin's `devtools.setup`, use `context.logs` to emit log entries. The `add()` method returns a **handle** with `.update()` and `.dismiss()` helpers:

```ts
export function myPlugin() {
  return {
    name: 'my-plugin',
    devtools: {
      async setup(context) {
        // Simple log
        await context.logs.add({
          message: 'Plugin initialized',
          level: 'info',
        })

        // Log with loading state, then update
        const log = await context.logs.add({
          message: 'Building...',
          level: 'info',
          status: 'loading',
        })

        // Later, update via the handle
        await log.update({
          message: 'Build complete',
          level: 'success',
          status: 'idle',
        })

        // Or dismiss it
        await log.dismiss()
      },
    },
  }
}
```

The `source` field is automatically set to the plugin name.

## Client-Side Usage

In dock action scripts, use `context.logs` — the same API as on the server:

```ts
import type { DockClientScriptContext } from '@vitejs/devtools-kit/client'

export default async function (context: DockClientScriptContext) {
  const log1 = await context.logs.add({
    message: 'Running audit...',
    level: 'info',
    status: 'loading',
    notify: true,
    category: 'a11y',
  })

  // ... do work ...

  await log1.update({
    message: 'Audit complete — 3 issues found',
    level: 'warn',
    status: 'idle',
  })
}
```

The `source` is automatically set to the dock entry id.

## Log Handle

`context.logs.add()` returns a `DevToolsLogHandle` with:

| Property/Method | Description |
|-----------------|-------------|
| `handle.id` | The log entry id |
| `handle.entry` | The current `DevToolsLogEntry` data |
| `handle.update(patch)` | Partially update the log entry |
| `handle.dismiss()` | Remove the log entry |

## Deduplication

When you call `context.logs.add()` with an explicit `id` that already exists, the existing entry is **updated** instead of duplicated. This is useful for logs that represent ongoing operations:

```ts
// First call creates the entry
await context.logs.add({ id: 'my-scan', message: 'Scanning...', level: 'info', status: 'loading' })

// Second call with same id updates it
await context.logs.add({ id: 'my-scan', message: 'Scan complete', level: 'success', status: 'idle' })
```

## Autofix

Autofix actions let users fix issues with a single click. There are two approaches:

### RPC-Based Autofix

Register an RPC function for the fix, then reference it by name:

```ts
context.rpc.register(defineRpcFunction({
  name: 'my-plugin:fix-deprecated-api',
  type: 'action',
  setup: () => ({
    async handler() {
      // Perform the fix
    },
  }),
}))

await context.logs.add({
  message: 'Deprecated API usage',
  level: 'warn',
  autofix: { type: 'rpc', name: 'my-plugin:fix-deprecated-api' },
})
```

### Function Autofix

For server-side plugins, you can pass a function directly:

```ts
await context.logs.add({
  message: 'Missing configuration',
  level: 'warn',
  autofix: async () => {
    // Write the config file
  },
})
```

## Toast Notifications

Set `notify: true` to show the log entry as a toast notification overlay. Toasts appear regardless of whether the Logs panel is open.

```ts
await context.logs.add({
  message: 'URL copied to clipboard',
  level: 'success',
  notify: true,
  autoDismiss: 2000, // disappear after 2 seconds
})
```

The default auto-dismiss time for toasts is 5 seconds.

## Managing Logs

```ts
// Remove a specific log by id
await context.logs.remove(entryId)

// Clear all logs
await context.logs.clear()
```

Logs have a maximum capacity of 1000 entries. When the limit is reached, the oldest entries are automatically removed.

## Dock Badge

The Logs dock icon automatically shows a badge with the total log count. The icon is hidden when there are no logs.
