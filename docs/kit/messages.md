---
outline: deep
---

# Messages & Notifications

Messages are structured entries a plugin emits from either the server or the client. They appear in the **Messages** panel (the official [`@devframes/plugin-messages`](https://devfra.me/guide/hub), mounted as a built-in) and can optionally surface as toast notifications — a11y warnings with element positions, runtime errors with stack traces, lint/test results, or short "URL copied" toasts.

For coded errors and warnings with stable codes and docs URLs, use [Structured Diagnostics](./diagnostics) instead.

## Emit a message

Server and client share the same `ctx.messages` API. Fire-and-forget by skipping the `await`:

```ts
ctx.messages.add({
  message: 'Plugin initialized',
  level: 'info',
})
```

`await` the call for a handle you can update later — handy for progress:

```ts
const handle = await ctx.messages.add({
  id: 'my-build',
  message: 'Building…',
  level: 'info',
  status: 'loading',
})

await handle.update({ message: 'Build complete', level: 'success', status: 'idle' })
```

## Common fields

| Field | Description |
|-------|-------------|
| `message` | Short title (required) |
| `level` | `'info' \| 'warn' \| 'error' \| 'success' \| 'debug'` (required) |
| `description` | Longer explanation |
| `filePosition` | `{ file, line?, column? }` — clickable source location |
| `elementPosition` | `{ selector?, boundingBox?, description? }` — DOM target |
| `notify` | Show as a toast |
| `category` / `labels` | Grouping and filter tags |
| `autoDismiss` | Toast lifetime in ms (default 5000) |
| `id` | Explicit id for dedup — re-adding updates the existing entry |

The `from` field (`'server'` or `'browser'`) is set automatically based on where you emitted the message.
