# Messages & Notifications

The Messages system allows plugins to emit structured message entries from both the server (Node.js) and client (browser) contexts. Messages are displayed in the built-in **Messages** panel in the DevTools dock, and can optionally appear as toast notifications.

> For *coded* errors and warnings with stable codes and docs URLs, see [Structured Diagnostics](./diagnostics) (`ctx.diagnostics`) instead.

## Use Cases

- **Accessibility audits** — Run a11y checks or similar tools on the client side, report warnings with element positions
- **Runtime errors** — Capture and display errors with stack traces
- **Linting & testing** — Run ESLint or test runners alongside the dev server and surface results with file positions
- **Notifications** — Short-lived messages like "URL copied" that auto-dismiss

## Message Entry Fields

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
| `autoDelete` | `number` | No | Time in ms to auto-delete the message entry |
| `status` | `'loading' \| 'idle'` | No | Status indicator (shows spinner when `'loading'`) |
| `id` | `string` | No | Explicit id for deduplication — re-adding with the same id updates the existing entry |

The `from` field is automatically set to `'server'` or `'browser'` depending on where the message was emitted.

## Usage

Both server-side and client-side share the same `context.messages` API. All methods return Promises, but you don't need to `await` them for fire-and-forget usage.

### Fire-and-Forget

```ts
// No await needed — just emit the message
context.messages.add({
  message: 'Plugin initialized',
  level: 'info',
})
```

### With Handle

`await` the `add()` call to get a `DevToolsMessageHandle` for subsequent updates:

```ts
// Await to get a handle for later updates
const handle = await context.messages.add({
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
        context.messages.add({
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
  const message = await context.messages.add({
    message: 'Running audit...',
    level: 'info',
    status: 'loading',
    notify: true,
  })

  // ... do work ...

  // Update via handle — can also be fire-and-forget
  message.update({
    message: 'Audit complete — 3 issues found',
    level: 'warn',
    status: 'idle',
  })
}
```

## Message Handle

`context.messages.add()` returns a `Promise<DevToolsMessageHandle>` with:

| Property/Method | Description |
|-----------------|-------------|
| `handle.id` | The message entry id |
| `handle.entry` | The current `DevToolsMessageEntry` data |
| `handle.update(patch)` | Partially update the message entry (returns `Promise`) |
| `handle.dismiss()` | Remove the message entry (returns `Promise`) |

Both `handle.update()` and `handle.dismiss()` return Promises but can be used without `await` for fire-and-forget.

## Deduplication

When you call `add()` with an explicit `id` that already exists, the existing entry is **updated** instead of duplicated. This is useful for messages that represent ongoing operations:

```ts
// First call creates the entry
context.messages.add({ id: 'my-scan', message: 'Scanning...', level: 'info', status: 'loading' })

// Second call with same id updates it
context.messages.add({ id: 'my-scan', message: 'Scan complete', level: 'success', status: 'idle' })
```

## Toast Notifications

Set `notify: true` to show the message entry as a toast notification overlay. Toasts appear regardless of whether the Messages panel is open.

```ts
context.messages.add({
  message: 'URL copied to clipboard',
  level: 'success',
  notify: true,
  autoDismiss: 2000, // disappear after 2 seconds
})
```

The default auto-dismiss time for toasts is 5 seconds.

## Managing Messages

```ts
// Remove a specific message by id
context.messages.remove(entryId)

// Clear all messages
context.messages.clear()
```

Messages have a maximum capacity of 1000 entries. When the limit is reached, the oldest entries are automatically removed.

> [!TIP]
> See the [A11y Checker example](/kit/examples#a11y-checker) for a plugin that uses messages to report accessibility violations with severity levels, element positions, and WCAG labels.

## Dock Badge

The Messages dock icon automatically shows a badge with the total message count. The icon is hidden when there are no messages.

## Events

The host emits events for anyone who wants to observe the message stream:

```ts
ctx.messages.events.on('message:added', (entry) => { /* ... */ })
ctx.messages.events.on('message:updated', (entry) => { /* ... */ })
ctx.messages.events.on('message:removed', (id) => { /* ... */ })
ctx.messages.events.on('message:cleared', () => { /* ... */ })
```

Use this to bridge messages into external tools — e.g. mirror them into a structured log file or forward certain categories to your own reporter:

```ts
ctx.messages.events.on('message:added', (entry) => {
  if (entry.category === 'a11y')
    console.log('a11y finding:', entry.message)
})
```

## Long-Running Operation Pattern

Combine `id`-based deduplication with `status: 'loading'` to drive a single message through a multi-step lifecycle:

```ts
async function rebuild(ctx) {
  const handle = await ctx.messages.add({
    id: 'my-plugin:rebuild',
    message: 'Rebuilding...',
    level: 'info',
    status: 'loading',
  })

  try {
    await doRebuild()
    await handle.update({ message: 'Rebuild complete', level: 'success', status: 'idle' })
  }
  catch (error) {
    await handle.update({
      message: 'Rebuild failed',
      level: 'error',
      description: (error as Error).message,
      stacktrace: (error as Error).stack,
      status: 'idle',
    })
  }
}
```
