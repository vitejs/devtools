# Logs & Notification Patterns

Structured log entries and toast notifications from both server and client contexts.

## Log Entry Types

```ts
type DevToolsLogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug'

interface DevToolsLogEntryInput {
  message: string // Required: short title
  level: DevToolsLogLevel // Required: severity
  description?: string // Detailed explanation
  stacktrace?: string // Stack trace string
  filePosition?: { file: string, line?: number, column?: number }
  elementPosition?: { selector?: string, boundingBox?: { x: number, y: number, width: number, height: number }, description?: string }
  notify?: boolean // Show as toast
  category?: string // Grouping (e.g., 'a11y', 'lint')
  labels?: string[] // Tags for filtering
  autoDismiss?: number // Toast dismiss time in ms (default: 5000)
  autoDelete?: number // Auto-delete time in ms
  status?: 'loading' | 'idle' // Shows spinner when loading
  id?: string // Explicit id for deduplication
}
```

The `from` field (`'server' | 'browser'`) is set automatically.

## Server-Side Patterns

### Fire-and-Forget in Setup

```ts
export function myPlugin() {
  return {
    name: 'my-plugin',
    devtools: {
      setup(ctx) {
        ctx.logs.add({
          message: 'Plugin initialized',
          level: 'info',
        })
      },
    },
  }
}
```

### Handle-Based Updates

```ts
export function myPlugin() {
  return {
    name: 'my-plugin',
    devtools: {
      async setup(ctx) {
        const log = await ctx.logs.add({
          id: 'my-plugin:build',
          message: 'Analyzing...',
          level: 'info',
          status: 'loading',
        })

        // Later, after work completes
        await log.update({
          message: 'Analysis complete — 42 modules',
          level: 'success',
          status: 'idle',
        })
      },
    },
  }
}
```

### File Position (Clickable Links)

```ts
ctx.logs.add({
  message: 'Unused import detected',
  level: 'warn',
  category: 'lint',
  filePosition: {
    file: '/src/App.vue',
    line: 12,
    column: 1,
  },
})
```

### Element Position (DOM Highlighting)

```ts
ctx.logs.add({
  message: 'Missing alt attribute on image',
  level: 'warn',
  category: 'a11y',
  labels: ['WCAG 1.1.1'],
  elementPosition: {
    selector: 'img.hero-image',
    description: '<img class="hero-image">',
  },
})
```

## Client-Side Patterns

### Client Script with Logs

```ts
import type { DockClientScriptContext } from '@vitejs/devtools-kit/client'

export default async function (ctx: DockClientScriptContext) {
  const log = await ctx.logs.add({
    message: 'Running audit...',
    level: 'info',
    status: 'loading',
    notify: true,
  })

  // ... perform work ...

  log.update({
    message: 'Audit complete — 3 issues found',
    level: 'warn',
    status: 'idle',
  })
}
```

## Toast Notifications

```ts
// Short-lived notification
ctx.logs.add({
  message: 'URL copied to clipboard',
  level: 'success',
  notify: true,
  autoDismiss: 2000,
})
```

Toasts appear as overlay notifications regardless of whether the Logs panel is open. Default auto-dismiss is 5 seconds.

## Deduplication

Re-adding with the same `id` updates the existing entry:

```ts
// Creates entry
ctx.logs.add({ id: 'my-scan', message: 'Scanning...', level: 'info', status: 'loading' })

// Updates same entry (no duplicate)
ctx.logs.add({ id: 'my-scan', message: 'Scan complete', level: 'success', status: 'idle' })
```

## Log Handle API

`ctx.logs.add()` returns `Promise<DevToolsLogHandle>`:

| Property/Method | Description |
|-----------------|-------------|
| `handle.id` | The log entry id |
| `handle.entry` | The current `DevToolsLogEntry` data |
| `handle.update(patch)` | Partially update the entry (returns `Promise`) |
| `handle.dismiss()` | Remove the entry (returns `Promise`) |

Both `update()` and `dismiss()` can be used without `await` for fire-and-forget.

## Managing Logs

```ts
// Remove specific log
ctx.logs.remove(entryId)

// Clear all logs
ctx.logs.clear()
```

Max capacity is 1000 entries; oldest entries are auto-removed when full.

## Dock Badge

The built-in Logs dock icon automatically shows a badge with the total log count and is hidden when empty.

## Real-World Example

See [`examples/plugin-a11y-checker`](https://github.com/vitejs/devtools/tree/main/examples/plugin-a11y-checker) for a complete plugin that uses logs to report accessibility violations with severity levels, element positions, WCAG labels, and log handle updates.
