---
outline: deep
---

# Terminals & Processes

`ctx.terminals` lets a plugin spawn and manage child processes. The hub aggregates every session into the **Terminals** panel (the official [`@devframes/plugin-terminals`](https://devfra.me/guide/hub), mounted as a built-in) and streams their output live — the same primitive [install launchers](./dock-system#install-launchers) use to track an install.

## Start a process

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

The first argument is what to execute (`command`, `args`, optional `cwd` / `env`); the second is terminal metadata. Spawned processes get `FORCE_COLOR=true` so output stays colored.

## Control a session

```ts
await session.terminate() // kill
await session.restart() // kill + re-spawn
const result = await session.getResult() // { exitCode, ... }
const cp = session.getChildProcess() // the Node ChildProcess
```

Pass a session's id to a `launcher` dock entry's `terminalSessionId` to give the card a "View in Terminal" link. See the [Devframe hub docs](https://devfra.me/guide/hub) for the full terminal API.
