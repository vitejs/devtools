---
outline: deep
---

# Messages & Notifications

`ctx.messages` is a structured message store with live updates, toasts, and positional hints that link a message entry back to a DOM element or source file. Use it to surface a11y findings, lint errors, runtime failures, or short-lived notifications like "URL copied".

The same API works from the server and the browser: each call is a Promise, but most callers fire-and-forget.

> **Note:** Previously named `ctx.logs`. The old field still works as a deprecated alias for one release cycle — see [DF0018](/errors/DF0018) for migration details.

## Entry Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | `string` | ✓ | Short title or summary. |
| `level` | `'info' \| 'warn' \| 'error' \| 'success' \| 'debug'` | ✓ | Severity — drives color and icon. |
| `description` | `string` | | Longer explanation shown in the detail panel. |
| `stacktrace` | `string` | | Formatted stack trace. |
| `filePosition` | `{ file, line?, column? }` | | Source file (clickable — opens in editor). |
| `elementPosition` | `{ selector?, boundingBox?, description? }` | | DOM anchor (for a11y, layout issues). |
| `notify` | `boolean` | | Also emit as a toast. |
| `category` | `string` | | Grouping key (e.g. `'a11y'`, `'lint'`). |
| `labels` | `string[]` | | Free-form tags for filtering. |
| `autoDismiss` | `number` | | Toast auto-dismiss in ms. |
| `autoDelete` | `number` | | Server-side auto-delete in ms. |
| `status` | `'loading' \| 'idle'` | | Spinner indicator when `'loading'`. |
| `id` | `string` | | Explicit id — re-adding with the same id updates the existing entry. |

`from` is automatically set to `'server'` or `'browser'` by the host.

## Fire-and-Forget

```ts
ctx.messages.add({
  message: 'Plugin initialized',
  level: 'info',
})
```

## With a Handle

`await` the call to get a handle for live updates:

```ts
const handle = await ctx.messages.add({
  id: 'my-devtool:build',
  message: 'Building…',
  level: 'info',
  status: 'loading',
})

// later:
await handle.update({
  message: 'Build complete',
  level: 'success',
  status: 'idle',
})

await handle.dismiss()
```

Re-adding with the same `id` updates the existing entry — use this to replace `update` + `dismiss` with a single call site.

## Toasts

Set `notify: true` to also render the message as a toast:

```ts
ctx.messages.add({
  message: 'URL copied to clipboard',
  level: 'success',
  notify: true,
  autoDismiss: 3000,
})
```

`autoDismiss` controls how long the toast stays on screen; the message entry persists in the panel until explicitly removed or `autoDelete` fires.

## Positional Hints

### File Position

Linking a message to a source file makes it clickable — clicking opens the file in the user's editor:

```ts
ctx.messages.add({
  message: 'Unused import',
  level: 'warn',
  category: 'lint',
  filePosition: { file: '/src/App.vue', line: 12, column: 4 },
})
```

### Element Position

DOM anchors are rendered as a highlight overlay when the user hovers the message entry:

```ts
// Typically from a browser-side audit:
ctx.messages.add({
  message: 'Button missing accessible name',
  level: 'warn',
  category: 'a11y',
  elementPosition: {
    selector: 'button.cta',
    boundingBox: { x: 100, y: 200, width: 120, height: 40 },
    description: 'Call-to-action button',
  },
})
```

## Worked Examples

### Long-running operation

```ts
async function rebuild(ctx) {
  const handle = await ctx.messages.add({
    id: 'my-devtool:rebuild',
    message: 'Rebuilding…',
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
      description: error.message,
      stacktrace: error.stack,
      status: 'idle',
    })
  }
}
```

### Category filter

```ts
ctx.messages.events.on('message:added', (entry) => {
  if (entry.category === 'a11y') {
    console.log('a11y finding:', entry.message)
  }
})
```

## Removing Entries

```ts
await ctx.messages.remove('my-devtool:build')
await ctx.messages.clear() // all entries
```

## Events

The host emits events for anyone who wants to observe the message stream:

```ts
ctx.messages.events.on('message:added', (entry) => { /* … */ })
ctx.messages.events.on('message:updated', (entry) => { /* … */ })
ctx.messages.events.on('message:removed', (id) => { /* … */ })
ctx.messages.events.on('message:cleared', () => { /* … */ })
```

Use this to bridge messages into external tools — e.g. mirror them into a structured log file or forward certain categories to your own reporter.

## Server vs Browser

Both sides share the same API. Browser-side calls go through the RPC client (— more idiomatically — the exported `DevToolsMessagesClient` interface). Entries carry a `from` field so the UI can distinguish server-originated messages from browser-originated ones.

> [!NOTE]
> The separate, Node-side structured diagnostics system used for DevFrame's own warnings / errors (`DF`-prefixed codes) is distinct from `ctx.messages`. See the [Diagnostics guide](./diagnostics) for `ctx.diagnostics`, the host-level wrapper around [`logs-sdk`](https://github.com/vercel-labs/logs-sdk).
