# Terminals & Subprocesses

Spawn and manage child processes from your plugin. Output streams in real-time to an xterm.js terminal inside DevTools.

## Starting a Child Process

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

### Execute Options

```ts
interface DevToolsChildProcessExecuteOptions {
  command: string
  args: string[]
  cwd?: string
  env?: Record<string, string>
}
```

The second argument provides terminal metadata (`id`, `title`, and optional `description`/`icon`).

> Color output is enabled automatically — `FORCE_COLOR` and `COLORS` environment variables are set to `'true'` by default.

## Session Lifecycle

While the process is running, call `restart()` to replace it within the same terminal session:

```ts
await session.restart()
const cp = session.getChildProcess()
```

When the process exits or you stop it with `await session.terminate()`, its output stream closes. To run the command again, remove the closed session and start a new one with a fresh ID:

```ts
ctx.terminals.remove(session)
const replacement = await ctx.terminals.startChildProcess(session.executeOptions, {
  id: 'my-plugin:build-watcher-2',
  title: session.title,
  icon: session.icon,
})
```

### Session Status

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

## Combining with Launcher Docks

A common pattern is pairing a launcher dock entry with a terminal session. The launcher gives the user a button to start the process on demand:

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

For scenarios that don't involve spawning a child process (e.g. streaming logs from an external source), register a session directly with a custom `ReadableStream`:

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
