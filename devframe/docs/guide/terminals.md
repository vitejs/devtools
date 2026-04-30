---
outline: deep
---

# Terminals

`ctx.terminals` lets a devtool spawn and manage child processes. Output is streamed in real time to an xterm.js terminal in the Terminals panel, and each session gets lifecycle controls (terminate / restart).

## Spawning a Child Process

`ctx.terminals.startChildProcess(executeOptions, terminalMeta)` creates a new session:

```ts
const session = await ctx.terminals.startChildProcess(
  {
    command: 'vite',
    args: ['build', '--watch'],
    cwd: process.cwd(),
    env: { NODE_ENV: 'development' },
  },
  {
    id: 'my-devtool:build-watcher',
    title: 'Build Watcher',
    icon: 'ph:terminal-duotone',
  },
)
```

The first argument describes the process:

| Field | Type | Description |
|-------|------|-------------|
| `command` | `string` | Executable name or path. |
| `args` | `string[]` | Command-line arguments. |
| `cwd` | `string` | Working directory. Defaults to the process cwd. |
| `env` | `Record<string, string>` | Environment variable overrides. |

The second argument is the terminal metadata (id, title, optional description/icon) — it lets users identify the session in the dock.

> [!NOTE]
> Color output is enabled automatically — `FORCE_COLOR` and `COLORS` default to `'true'` so tools like Vite, esbuild, and vitest render colored output in the panel.

## Session Lifecycle

`startChildProcess` returns a `DevToolsChildProcessTerminalSession`:

```ts
// Terminate (SIGTERM, then SIGKILL on timeout)
await session.terminate()

// Kill + re-spawn with the same execute options
await session.restart()

// Access the underlying Node.js ChildProcess
const cp = session.getChildProcess()
```

The session also carries a streaming `buffer` / `stream` of output chunks, plus a `status` field (`'running' | 'stopped' | 'error'`) that updates automatically.

## Registering an External Session

If you manage the process yourself (e.g. a long-running worker that predates your devtool), register it via `ctx.terminals.register`:

```ts
ctx.terminals.register({
  id: 'my-devtool:worker',
  title: 'Worker',
  icon: 'ph:gear-duotone',
  status: 'running',
  buffer: [], // fill with existing output
  stream: myReadableStream, // ReadableStream<string>
})
```

Emit chunks by pushing to the stream the host subscribed to — the Terminals panel will render them as they arrive.

## Combining with Launcher Docks

Launchers pair naturally with terminals: the launcher button kicks off a child process, and the panel surfaces its live output. See the [Dock System → Launcher](./dock-system#launcher) section.

```ts
ctx.docks.register({
  id: 'my-devtool:setup',
  title: 'My Setup',
  icon: 'ph:rocket-launch-duotone',
  type: 'launcher',
  launcher: {
    title: 'Run Dev Server',
    onLaunch: async () => {
      await ctx.terminals.startChildProcess(
        { command: 'npm', args: ['run', 'dev'] },
        { id: 'my-devtool:dev', title: 'npm run dev', icon: 'ph:terminal-duotone' },
      )
    },
  },
})
```

## Events

```ts
ctx.terminals.events.on('terminal:session:updated', (session) => {
  console.log(session.id, session.status)
})

ctx.terminals.events.on('terminal:session:stream-chunk', ({ id, chunks, ts }) => {
  // chunks: string[] delivered together, timestamped ms
})
```

Stream chunks arrive in batches (the host coalesces rapid output), so each event may contain multiple lines.

## Inspection

```ts
for (const session of ctx.terminals.sessions.values()) {
  console.log(session.id, session.title, session.status)
}
```

`ctx.terminals.sessions` is a live `Map<string, DevToolsTerminalSession>` — handy for diagnostics, testing, and for building custom terminal UIs that mirror the built-in panel.
