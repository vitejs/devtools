---
outline: deep
---

# Terminals & Subprocesses

DevTools Kit includes a built-in terminal host that lets your plugin spawn and manage child processes. Output is streamed in real-time to an xterm.js UI inside DevTools.

## Starting a Child Process

The primary API is `ctx.terminals.startChildProcess()`:

```ts
const session = await ctx.terminals.startChildProcess(
  {
    command: 'vite',
    args: ['build', '--watch'],
    cwd: process.cwd(),
    env: { NODE_ENV: 'development' },
  },
  {
    id: 'my-plugin:build-watcher',
    title: 'Build Watcher',
    icon: 'ph:terminal-duotone',
  },
)
```

The first argument describes what to execute:

```ts
interface DevToolsChildProcessExecuteOptions {
  command: string
  args: string[]
  cwd?: string
  env?: Record<string, string>
}
```

The second argument provides terminal metadata (id, title, and optional description/icon).

### Returned Session

`startChildProcess()` returns a `DevToolsChildProcessTerminalSession` with lifecycle controls:

```ts
// Terminate the process
await session.terminate()

// Restart (kill + re-spawn)
await session.restart()

// Access the underlying Node.js ChildProcess
const cp = session.getChildProcess()
```

> [!NOTE]
> Color output is enabled automatically — `FORCE_COLOR` and `COLORS` environment variables are set to `'true'` by default.

## Combining with Launcher Docks

A common pattern is pairing a [launcher dock entry](/kit/dock-system#launcher-entries) with a terminal session. The launcher gives the user a button to start the process on demand:

```ts
ctx.docks.register({
  id: 'my-plugin:launcher',
  title: 'My App',
  icon: 'ph:rocket-launch-duotone',
  type: 'launcher',
  launcher: {
    title: 'Start My App',
    description: 'Launch the dev server',
    onLaunch: async () => {
      await ctx.terminals.startChildProcess(
        {
          command: 'vite',
          args: ['dev'],
          cwd: process.cwd(),
        },
        {
          id: 'my-plugin:dev-server',
          title: 'Dev Server',
        },
      )
    },
  },
})
```

## Custom Terminal Sessions

For scenarios that don't involve spawning a child process (e.g. streaming logs from an external source), you can register a session directly with a custom `ReadableStream`:

```ts
let controller: ReadableStreamDefaultController<string>

const stream = new ReadableStream<string>({
  start(c) {
    controller = c
  },
})

ctx.terminals.register({
  id: 'my-plugin:custom-stream',
  title: 'Custom Output',
  status: 'running',
  stream,
})

// Push data to the terminal
controller.enqueue('Hello from custom stream!\n')
```

## Session Lifecycle

Each terminal session has a `status` field:

| Status | Description |
|--------|-------------|
| `running` | Process is active and streaming output |
| `stopped` | Process exited normally |
| `error` | Process exited with an error |

Update a session's metadata or status at any time:

```ts
ctx.terminals.update({
  id: 'my-plugin:build-watcher',
  status: 'stopped',
  title: 'Build Watcher (done)',
})
```
