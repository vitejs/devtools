---
outline: deep
---

# Terminals & Subprocesses

DevTools Kit's terminal host lets a plugin spawn and manage child processes. Output streams in real time to an xterm.js panel inside DevTools.

## Starting a child process

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

### Returned session

`startChildProcess()` returns a `DevToolsChildProcessTerminalSession` with lifecycle controls:

```ts
// Terminate the process
await session.terminate()

// Restart (kill + re-spawn)
await session.restart()

// Access the underlying Node.js ChildProcess
const cp = session.getChildProcess()
```

The spawned process gets `FORCE_COLOR=true` and `COLORS=true` so terminal output stays coloured by default.

## Combining with launcher docks

Pair a [launcher dock entry](/kit/dock-system#launcher-entries) with a terminal session for a one-button start:

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

## Custom terminal sessions

To stream from any source — external logs, custom protocols, anything yielding strings — register a session with a `ReadableStream`:

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

## Session lifecycle

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

## Events

Subscribe to lifecycle changes (register, update, remove) via the host event emitter:

```ts
ctx.terminals.events.on('terminal:session:updated', (session) => {
  console.log(session.id, session.status)
})
```

Output chunks travel through the [streaming channel](/kit/streaming) `devframe:terminals`, keyed by session id. The kit's `DevToolsTerminalHost` already pipes each session's `ReadableStream<string>` into the channel; this matters only when building a custom terminal renderer:

```ts
const reader = rpc.streaming.subscribe<string>(
  'devframe:terminals',
  sessionId,
)
for await (const chunk of reader) writeToTerminal(chunk)
```

## Inspection

```ts
for (const session of ctx.terminals.sessions.values()) {
  console.log(session.id, session.title, session.status)
}
```

`ctx.terminals.sessions` is a live `Map<string, DevToolsTerminalSession>` — useful for diagnostics, testing, and custom terminal UIs that mirror the built-in panel.
