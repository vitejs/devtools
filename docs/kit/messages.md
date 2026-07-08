# Messages & Notifications

The Messages system lets plugins emit structured message entries from both the server (Node.js) and client (browser) contexts. Entries appear in the **Messages** panel (the official [`@devframes/plugin-messages`](https://devfra.me), mounted as a built-in) and can optionally surface as toast notifications. For *coded* errors and warnings with stable codes and docs URLs, use [Structured Diagnostics](./diagnostics) (`ctx.diagnostics`) instead.

## Use cases

- **Accessibility audits** — run a11y checks on the client and report warnings with element positions.
- **Runtime errors** — capture and display errors with stack traces.
- **Linting & testing** — run ESLint or test runners alongside the dev server and surface results with file positions.
- **Notifications** — short-lived messages like "URL copied" that auto-dismiss.

## Message entry fields

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

The `from` field is set to `'server'` or `'browser'` automatically, based on where the message was emitted.

## Usage

Server and client share the same `context.messages` API. Methods return Promises; for fire-and-forget usage, skip the `await`.

### Fire-and-forget

```ts
// No await needed — just emit the message
context.messages.add({
  message: 'Plugin initialized',
  level: 'info',
})
```

### With handle

`await` the `add()` call for a `DevToolsMessageHandle` you can update later:

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

### Server-side example

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

### Client-side example

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

## Message handle

`context.messages.add()` returns a `Promise<DevToolsMessageHandle>` with:

| Property/Method | Description |
|-----------------|-------------|
| `handle.id` | The message entry id |
| `handle.entry` | The current `DevToolsMessageEntry` data |
| `handle.update(patch)` | Partially update the message entry (returns `Promise`) |
| `handle.dismiss()` | Remove the message entry (returns `Promise`) |

Both `handle.update()` and `handle.dismiss()` return Promises; the `await` is optional.

## Deduplication

Calling `add()` with an explicit `id` that already exists updates the existing entry rather than creating a duplicate — useful for ongoing operations:

```ts
// First call creates the entry
context.messages.add({ id: 'my-scan', message: 'Scanning...', level: 'info', status: 'loading' })

// Second call with same id updates it
context.messages.add({ id: 'my-scan', message: 'Scan complete', level: 'success', status: 'idle' })
```

## Toast notifications

Set `notify: true` to surface the message entry as a toast overlay. Toasts appear whether or not the Messages panel is open.

```ts
context.messages.add({
  message: 'URL copied to clipboard',
  level: 'success',
  notify: true,
  autoDismiss: 2000, // disappear after 2 seconds
})
```

Toast auto-dismiss defaults to 5 seconds.

## Managing messages

```ts
// Remove a specific message by id
context.messages.remove(entryId)

// Clear all messages
context.messages.clear()
```

Capacity tops out at 1000 entries; the oldest are dropped automatically when the limit is hit.

The [A11y Checker example](/kit/examples#a11y-checker) is a plugin that uses messages to report accessibility violations with severity levels, element positions, and WCAG labels.

## Events

The host emits events for observers of the message stream:

```ts
ctx.messages.events.on('message:added', (entry) => { /* ... */ })
ctx.messages.events.on('message:updated', (entry) => { /* ... */ })
ctx.messages.events.on('message:removed', (id) => { /* ... */ })
ctx.messages.events.on('message:cleared', () => { /* ... */ })
```

Use the events to bridge messages into external tools — mirror them into a structured log, forward certain categories to your own reporter, etc.:

```ts
ctx.messages.events.on('message:added', (entry) => {
  if (entry.category === 'a11y')
    console.log('a11y finding:', entry.message)
})
```

## Long-running operation pattern

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
