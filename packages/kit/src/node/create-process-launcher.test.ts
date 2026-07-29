import type { ViteDevToolsNodeContext } from '../types/vite-plugin'
import { describe, expect, it, vi } from 'vitest'
import { createProcessLauncher } from './create-process-launcher'

interface FakeDock { id: string, type: string, launcher?: any }

function fakeCtx(): {
  ctx: ViteDevToolsNodeContext
  registered: Map<string, FakeDock>
  commands: Map<string, (...a: any[]) => any>
  sessions: Map<string, { status: string }>
  /** Resolve the most recently spawned session's process outcome. */
  resolveExit: (code: number) => void
} {
  const registered = new Map<string, FakeDock>()
  const commands = new Map<string, (...a: any[]) => any>()
  const sessions = new Map<string, { status: string }>()

  // A stable `resolveExit` that always targets the latest spawned run. If it is
  // called before the (async) spawn completes, the code is buffered and applied
  // as soon as the run exists — this lets a test resolve an exit right after
  // kicking off a launch without awaiting it.
  let currentResolve: ((code: number) => void) | undefined
  let bufferedExit: number | undefined
  const resolveExit = (code: number): void => {
    if (currentResolve)
      currentResolve(code)
    else
      bufferedExit = code
  }

  const ctx = {
    cwd: '/project',
    docks: {
      register: (e: FakeDock) => registered.set(e.id, e),
      update: (e: FakeDock) => registered.set(e.id, e),
    },
    commands: {
      register: (c: { id: string, handler?: (...a: any[]) => any }) => {
        if (c.handler)
          commands.set(c.id, c.handler)
      },
      execute: (id: string, ...a: any[]) => commands.get(id)?.(...a),
    },
    terminals: {
      sessions,
      // Mirror the real host: registering an id that is still present rejects
      // (DF8200), so the launcher must drop a prior session before respawning.
      startChildProcess: vi.fn(async (_exec, meta: { id: string }) => {
        if (sessions.has(meta.id))
          throw new Error(`Terminal session with id "${meta.id}" already registered`)
        const entry = { status: 'running' }
        sessions.set(meta.id, entry)
        const result = new Promise<{ exitCode: number }>((resolve) => {
          currentResolve = (exitCode: number) => {
            // The real host leaves the session in the map, only flipping status.
            entry.status = exitCode === 0 ? 'stopped' : 'error'
            resolve({ exitCode })
          }
        })
        if (bufferedExit !== undefined) {
          const code = bufferedExit
          bufferedExit = undefined
          currentResolve!(code)
        }
        return {
          getResult: () => result,
          // `terminate()` kills the process and marks it stopped but keeps the
          // session registered — exactly what the real host does.
          terminate: async () => {
            entry.status = 'stopped'
          },
        }
      }),
    },
  } as unknown as ViteDevToolsNodeContext

  return { ctx, registered, commands, sessions, resolveExit }
}

const baseOptions = {
  id: 'my-app',
  title: 'My App',
  icon: 'ph:rocket-launch-duotone',
  process: { command: 'vite', args: ['dev'], cwd: '/project' },
}

async function mount(ctx: ViteDevToolsNodeContext, options: Parameters<typeof createProcessLauncher>[0]): Promise<void> {
  await createProcessLauncher(options).devtools!.setup!(ctx)
}

describe('createProcessLauncher', () => {
  it('registers an idle launcher bound to a launch command', async () => {
    const { ctx, registered, commands } = fakeCtx()
    await mount(ctx, baseOptions)

    const dock = registered.get('my-app')!
    expect(dock.type).toBe('launcher')
    expect(dock.launcher.status).toBe('idle')
    expect(dock.launcher.command).toBe('my-app:launch')
    // No session is tracked before launch.
    expect(dock.launcher.terminalSessionId).toBeUndefined()
    expect(commands.has('my-app:launch')).toBe(true)
  })

  it('spawns the process, tracks its session, and shows running progress', async () => {
    const { ctx, registered } = fakeCtx()
    await mount(ctx, baseOptions)

    // Launch via the bound command (what the palette / button both do).
    await ctx.commands.execute('my-app:launch')

    expect((ctx.terminals as any).startChildProcess).toHaveBeenCalledOnce()
    const dock = registered.get('my-app')!
    expect(dock.launcher.status).toBe('success')
    expect(dock.launcher.terminalSessionId).toBe('my-app')
    expect(dock.launcher.digest).toBe('Running')
  })

  it('is idempotent while the session is running', async () => {
    const { ctx } = fakeCtx()
    await mount(ctx, baseOptions)

    await ctx.commands.execute('my-app:launch')
    await ctx.commands.execute('my-app:launch')

    expect((ctx.terminals as any).startChildProcess).toHaveBeenCalledOnce()
  })

  it('marks the launcher errored when the process exits non-zero', async () => {
    const { ctx, registered, resolveExit } = fakeCtx()
    await mount(ctx, baseOptions)

    await ctx.commands.execute('my-app:launch')
    resolveExit(1)
    await Promise.resolve()
    await Promise.resolve()

    expect(registered.get('my-app')!.launcher.status).toBe('error')
  })

  it('swaps the launcher to an iframe once a server launcher is ready', async () => {
    const { ctx, registered } = fakeCtx()
    await mount(ctx, {
      ...baseOptions,
      serve: {
        onReady: async () => 'http://localhost:5173/',
      },
    })

    await ctx.commands.execute('my-app:launch')

    const dock = registered.get('my-app')!
    expect(dock.type).toBe('iframe')
    expect((dock as any).url).toBe('http://localhost:5173/')
  })

  it('fails fast to an error when a server launcher exits before it is ready', async () => {
    const { ctx, registered, resolveExit } = fakeCtx()
    await mount(ctx, {
      ...baseOptions,
      // A readiness probe that would otherwise hang forever.
      serve: { onReady: () => new Promise<string>(() => {}) },
    })

    const launch = ctx.commands.execute('my-app:launch')
    resolveExit(1)
    await (launch as Promise<unknown>).catch(() => {})

    const dock = registered.get('my-app')!
    expect(dock.type).toBe('launcher')
    expect(dock.launcher.status).toBe('error')
    expect(dock.launcher.error).toContain('exited with code 1')
  })

  it('re-shows the iframe when a running server launcher is invoked again', async () => {
    const { ctx, registered } = fakeCtx()
    await mount(ctx, {
      ...baseOptions,
      serve: { onReady: async () => 'http://localhost:5173/' },
    })

    await ctx.commands.execute('my-app:launch')
    // Session stays running; a second invoke re-swaps without respawning.
    await ctx.commands.execute('my-app:launch')

    expect((ctx.terminals as any).startChildProcess).toHaveBeenCalledOnce()
    expect(registered.get('my-app')!.type).toBe('iframe')
  })

  it('reverts the iframe back to an idle launcher when the served process exits', async () => {
    const { ctx, registered, resolveExit } = fakeCtx()
    await mount(ctx, {
      ...baseOptions,
      serve: { onReady: async () => 'http://localhost:5173/' },
    })

    await ctx.commands.execute('my-app:launch')
    expect(registered.get('my-app')!.type).toBe('iframe')

    // The embedded server's process is terminated.
    resolveExit(0)
    await new Promise(r => setTimeout(r))

    const dock = registered.get('my-app')!
    expect(dock.type).toBe('launcher')
    expect(dock.launcher.status).toBe('idle')
  })

  it('drops the stale session and respawns when relaunched after an exit', async () => {
    const { ctx, registered, resolveExit } = fakeCtx()
    await mount(ctx, {
      ...baseOptions,
      serve: { onReady: async () => 'http://localhost:5173/' },
    })

    await ctx.commands.execute('my-app:launch')
    // Process exits — dock reverts to a launcher, but the real host leaves the
    // stopped session registered under its id.
    resolveExit(1)
    await new Promise(r => setTimeout(r))
    expect(registered.get('my-app')!.type).toBe('launcher')
    expect((ctx as any).terminals.sessions.has('my-app')).toBe(true)

    // Relaunching must clear the lingering session first; otherwise the real
    // host would reject the duplicate id. It respawns and re-embeds.
    await ctx.commands.execute('my-app:launch')

    expect((ctx.terminals as any).startChildProcess).toHaveBeenCalledTimes(2)
    expect(registered.get('my-app')!.type).toBe('iframe')
  })
})
