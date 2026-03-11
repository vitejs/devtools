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

        // Warning with file position
        context.logs.add({
          message: 'Deprecated API usage detected',
          level: 'warn',
          description: 'The `foo()` API is deprecated. Use `bar()` instead.',
          filePosition: { file: 'src/app.ts', line: 42, column: 5 },
          category: 'lint',
        })

        // Error with stack trace
        context.logs.add({
          message: 'Build failed',
          level: 'error',
          stacktrace: error.stack,
          category: 'build',
        })

        // Short notification
        context.logs.add({
          message: 'Configuration reloaded',
          level: 'success',
          notify: true,
          autoDismiss: 3000,
          autoDelete: 10000,
        })
      },
    },
  }
}
```

The `source` field is automatically set to the plugin name.

## Client-Side Usage

From client-side code (running in the user's browser), emit logs via the RPC client:

```ts
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'

const client = await getDevToolsRpcClient()

await client.call('devtoolskit:internal:logs:add', {
  message: 'Accessibility issue: missing alt text',
  level: 'warn',
  description: 'Images should have alt attributes for screen readers.',
  elementPosition: {
    selector: 'img.hero-image',
    description: 'Hero image in the header',
  },
  category: 'a11y',
  labels: ['wcag-2.1', 'images'],
}, 'axe-plugin')
```

The second argument to `logs:add` is the `source` identifier.

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

context.logs.add({
  message: 'Deprecated API usage',
  level: 'warn',
  autofix: { type: 'rpc', name: 'my-plugin:fix-deprecated-api' },
})
```

### Function Autofix

For server-side plugins, you can pass a function directly:

```ts
context.logs.add({
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
// Remove a specific log
context.logs.remove(entry.id)

// Clear all logs
context.logs.clear()
```

Logs have a maximum capacity of 1000 entries. When the limit is reached, the oldest entries are automatically removed.

## Dock Badge

The Logs dock icon automatically shows a badge with the total log count. The icon is hidden when there are no logs.
