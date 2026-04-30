---
outline: deep
---

# Logs & Notifications

`ctx.logs` is a structured log store with live updates, toasts, and positional hints that link a log entry back to a DOM element or source file. Use it to surface a11y findings, lint errors, runtime failures, or short-lived notifications like "URL copied".

The same API works from the server and the browser: each call is a Promise, but most callers fire-and-forget.

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
ctx.logs.add({
  message: 'Plugin initialized',
  level: 'info',
})
```

## With a Handle

`await` the call to get a handle for live updates:

```ts
const handle = await ctx.logs.add({
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

Set `notify: true` to also render the log as a toast:

```ts
ctx.logs.add({
  message: 'URL copied to clipboard',
  level: 'success',
  notify: true,
  autoDismiss: 3000,
})
```

`autoDismiss` controls how long the toast stays on screen; the log entry persists in the panel until explicitly removed or `autoDelete` fires.

## Positional Hints

### File Position

Linking a log to a source file makes it clickable — clicking opens the file in the user's editor:

```ts
ctx.logs.add({
  message: 'Unused import',
  level: 'warn',
  category: 'lint',
  filePosition: { file: '/src/App.vue', line: 12, column: 4 },
})
```

### Element Position

DOM anchors are rendered as a highlight overlay when the user hovers the log entry:

```ts
// Typically from a browser-side audit:
ctx.logs.add({
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
  const handle = await ctx.logs.add({
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
ctx.logs.events.on('log:added', (entry) => {
  if (entry.category === 'a11y') {
    console.log('a11y finding:', entry.message)
  }
})
```

## Removing Entries

```ts
await ctx.logs.remove('my-devtool:build')
await ctx.logs.clear() // all entries
```

## Events

The host emits events for anyone who wants to observe the log stream:

```ts
ctx.logs.events.on('log:added', (entry) => { /* … */ })
ctx.logs.events.on('log:updated', (entry) => { /* … */ })
ctx.logs.events.on('log:removed', (id) => { /* … */ })
ctx.logs.events.on('log:cleared', () => { /* … */ })
```

Use this to bridge logs into external tools — e.g. mirror them into a structured log file or forward certain categories to your own reporter.

## Server vs Browser

Both sides share the same API. Browser-side calls go through the RPC client (`rpc.logs` or — more idiomatically — the exported `DevToolsLogsClient` interface). Entries carry a `from` field so the UI can distinguish server-originated logs from browser-originated ones.

> [!NOTE]
> The separate, Node-side [structured diagnostics system](https://github.com/vercel-labs/logs-sdk) used for DevFrame's own warnings / errors (`DF`-prefixed codes) is distinct from `ctx.logs`. Diagnostics are author-defined coded errors with documentation URLs; `ctx.logs` is free-form plugin output shown in the Logs panel.
