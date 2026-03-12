# Logs & Notifications

The Logs system allows plugins to emit structured log entries from both the server (Node.js) and client (browser) contexts. Logs are displayed in the built-in **Logs** panel in the DevTools dock, and can optionally appear as toast notifications.

## Use Cases

- **Accessibility audits** — Run a11y checks or similar tools on the client side, report warnings with element positions
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
| `notify` | `boolean` | No | Show as a toast notification |
| `category` | `string` | No | Grouping category (e.g., `'a11y'`, `'lint'`) |
| `labels` | `string[]` | No | Tags for filtering |
| `autoDismiss` | `number` | No | Time in ms to auto-dismiss the toast (default: 5000) |
| `autoDelete` | `number` | No | Time in ms to auto-delete the log entry |
| `status` | `'loading' \| 'idle'` | No | Status indicator (shows spinner when `'loading'`) |
| `id` | `string` | No | Explicit id for deduplication — re-adding with the same id updates the existing entry |

The `source` field is automatically set to `'server'` or `'client'` depending on where the log was emitted.

## Server-Side Usage

In your plugin's `devtools.setup`, use `context.logs` to emit log entries:

```ts
export function myPlugin() {
  return {
    name: 'my-plugin',
    devtools: {
      setup(context) {
        // Simple log
        context.logs.add({
          message: 'Plugin initialized',
          level: 'info',
        })

        // Log with loading state, then update
        const entry = context.logs.add({
          id: 'my-build',
          message: 'Building...',
          level: 'info',
          status: 'loading',
        })

        // Later, update via update()
        context.logs.update(entry.id, {
          message: 'Build complete',
          level: 'success',
          status: 'idle',
        })
      },
    },
  }
}
```

## Client-Side Usage

In dock action scripts, use `context.logs` — an async client that communicates via RPC:

```ts
import type { DockClientScriptContext } from '@vitejs/devtools-kit/client'

export default async function (context: DockClientScriptContext) {
  const log = await context.logs.add({
    message: 'Running audit...',
    level: 'info',
    status: 'loading',
    notify: true,
    category: 'a11y',
  })

  // ... do work ...

  await log.update({
    message: 'Audit complete — 3 issues found',
    level: 'warn',
    status: 'idle',
  })
}
```

## Log Handle (Client-Side)

`context.logs.add()` on the client returns a `DevToolsLogHandle` with:

| Property/Method | Description |
|-----------------|-------------|
| `handle.id` | The log entry id |
| `handle.entry` | The current `DevToolsLogEntry` data |
| `handle.update(patch)` | Partially update the log entry |
| `handle.dismiss()` | Remove the log entry |

## Deduplication

When you call `add()` with an explicit `id` that already exists, the existing entry is **updated** instead of duplicated. This is useful for logs that represent ongoing operations:

```ts
// First call creates the entry
context.logs.add({ id: 'my-scan', message: 'Scanning...', level: 'info', status: 'loading' })

// Second call with same id updates it
context.logs.add({ id: 'my-scan', message: 'Scan complete', level: 'success', status: 'idle' })
```

## Toast Notifications

Set `notify: true` to show the log entry as a toast notification overlay. Toasts appear regardless of whether the Logs panel is open.

```ts
context.logs.add({
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
context.logs.remove(entryId)

// Clear all logs
context.logs.clear()
```

Logs have a maximum capacity of 1000 entries. When the limit is reached, the oldest entries are automatically removed.

## Dock Badge

The Logs dock icon automatically shows a badge with the total log count. The icon is hidden when there are no logs.
