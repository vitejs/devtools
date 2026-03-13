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

## Usage

Both server-side and client-side share the same `context.logs` API. All methods return Promises, but you don't need to `await` them for fire-and-forget usage.

### Fire-and-Forget

```ts
// No await needed — just emit the log
context.logs.add({
  message: 'Plugin initialized',
  level: 'info',
})
```

### With Handle

`await` the `add()` call to get a `DevToolsLogHandle` for subsequent updates:

```ts
// Await to get a handle for later updates
const handle = await context.logs.add({
  id: 'my-build',
  message: 'Building...',
  level: 'info',
  status: 'loading',
})

// Later, update via the handle
await handle.update({
  message: 'Build complete',
  level: 'success',
  status: 'idle',
})

// Or dismiss it
await handle.dismiss()
```

### Server-Side Example

```ts
export function myPlugin() {
  return {
    name: 'my-plugin',
    devtools: {
      setup(context) {
        // Fire-and-forget
        context.logs.add({
          message: 'Plugin initialized',
          level: 'info',
        })
      },
    },
  }
}
```

### Client-Side Example

```ts
import type { DockClientScriptContext } from '@vitejs/devtools-kit/client'

export default async function (context: DockClientScriptContext) {
  // Await to get the handle
  const log = await context.logs.add({
    message: 'Running audit...',
    level: 'info',
    status: 'loading',
    notify: true,
  })

  // ... do work ...

  // Update via handle — can also be fire-and-forget
  log.update({
    message: 'Audit complete — 3 issues found',
    level: 'warn',
    status: 'idle',
  })
}
```

## Log Handle

`context.logs.add()` returns a `Promise<DevToolsLogHandle>` with:

| Property/Method | Description |
|-----------------|-------------|
| `handle.id` | The log entry id |
| `handle.entry` | The current `DevToolsLogEntry` data |
| `handle.update(patch)` | Partially update the log entry (returns `Promise`) |
| `handle.dismiss()` | Remove the log entry (returns `Promise`) |

Both `handle.update()` and `handle.dismiss()` return Promises but can be used without `await` for fire-and-forget.

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

> [!TIP]
> See the [A11y Checker example](/kit/examples#a11y-checker) for a plugin that uses logs to report accessibility violations with severity levels, element positions, and WCAG labels.

## Dock Badge

The Logs dock icon automatically shows a badge with the total log count. The icon is hidden when there are no logs.
