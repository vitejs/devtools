import type { ViteDevToolsNodeContext } from '../types/vite-plugin'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createInstallLauncher } from './create-install-launcher'

const { isPackageExists, detectPackageManager, addDependencyCommand } = vi.hoisted(() => ({
  isPackageExists: vi.fn(),
  detectPackageManager: vi.fn(),
  addDependencyCommand: vi.fn(),
}))

vi.mock('local-pkg', () => ({ isPackageExists }))
vi.mock('nypm', () => ({ detectPackageManager, addDependencyCommand }))

interface FakeDock { id: string, type: string, launcher?: any, [k: string]: any }

function fakeCtx(opts: { viteServer?: boolean } = {}): {
  ctx: ViteDevToolsNodeContext
  registered: Map<string, FakeDock>
  sessions: Map<string, { status: string }>
  startChildProcess: ReturnType<typeof vi.fn>
} {
  const registered = new Map<string, FakeDock>()
  const commandHandlers = new Map<string, (...args: any[]) => any>()
  const sessions = new Map<string, { status: string }>()

  // Each spawn resolves immediately with a successful exit unless overridden
  // per-test via `startChildProcess.mockImplementationOnce(...)`.
  const startChildProcess = vi.fn(async (_exec: unknown, meta: { id: string }) => {
    if (sessions.has(meta.id))
      throw new Error(`Terminal session with id "${meta.id}" already registered`)
    sessions.set(meta.id, { status: 'running' })
    return {
      getResult: () => Promise.resolve({ exitCode: 0 }),
      terminate: async () => {
        sessions.set(meta.id, { status: 'stopped' })
      },
    }
  })

  const ctx = {
    // Distinct from `workspaceRoot` so tests can assert the install runs
    // against the workspace root, not the (nested) project `cwd`.
    cwd: '/project/apps/web',
    workspaceRoot: '/project',
    viteServer: opts.viteServer ? {} : undefined,
    docks: {
      register: (e: FakeDock) => registered.set(e.id, e),
      update: (e: FakeDock) => registered.set(e.id, e),
    },
    commands: {
      register: (c: { id: string, handler?: (...args: any[]) => any }) => {
        if (c.handler)
          commandHandlers.set(c.id, c.handler)
      },
      execute: (id: string, ...args: any[]) => commandHandlers.get(id)?.(...args),
    },
    terminals: {
      sessions,
      startChildProcess,
    },
  } as unknown as ViteDevToolsNodeContext
  return { ctx, registered, sessions, startChildProcess }
}

async function mount(ctx: ViteDevToolsNodeContext, options: Parameters<typeof createInstallLauncher>[0]): Promise<void> {
  const plugin = createInstallLauncher(options)
  await plugin.devtools!.setup!(ctx)
}

const baseOptions = {
  id: 'rolldown',
  title: 'Rolldown',
  icon: '/__devtools-assets/rolldown.svg',
  groupId: 'viteplus',
  label: 'Rolldown DevTools',
  install: ['@vitejs/devtools-rolldown@^0.4.1'],
}

beforeEach(() => {
  isPackageExists.mockReset()
  detectPackageManager.mockReset()
  addDependencyCommand.mockReset()
  detectPackageManager.mockResolvedValue({ name: 'pnpm' })
  addDependencyCommand.mockReturnValue('pnpm add --dev @vitejs/devtools-rolldown@^0.4.1')
})

describe('createInstallLauncher', () => {
  it('registers an idle launcher dock naming the package to install', async () => {
    const { ctx, registered } = fakeCtx()
    await mount(ctx, baseOptions)

    const dock = registered.get('rolldown')!
    expect(dock.type).toBe('launcher')
    expect(dock.groupId).toBe('viteplus')
    expect(dock.launcher.status).toBe('idle')
    expect(dock.launcher.title).toBe('Rolldown DevTools')
    // The button names the concrete package, not the friendly integration title.
    expect(dock.launcher.buttonStart).toBe('Install @vitejs/devtools-rolldown')
    // The launch action is the bound command (the serializable path); no
    // in-process onLaunch is set.
    expect(dock.launcher.command).toBe('vite:devtools:install:rolldown')
    expect(dock.launcher.onLaunch).toBeUndefined()
    expect(dock.launcher.terminalSessionId).toBeUndefined()
  })

  it('names the button after an explicit `pkg` when given', async () => {
    const { ctx, registered } = fakeCtx()
    await mount(ctx, { ...baseOptions, id: 'oxc', label: 'Oxc DevTools', install: ['@vitejs/devtools-oxc@latest'], pkg: '@vitejs/devtools-oxc' })

    expect(registered.get('oxc')!.launcher.buttonStart).toBe('Install @vitejs/devtools-oxc')
  })

  it('binds the install action to a command that drives the launch', async () => {
    const { ctx, registered } = fakeCtx({ viteServer: true })
    isPackageExists.mockReturnValue(true)

    await mount(ctx, baseOptions)

    // The launcher advertises its bound command id…
    expect(registered.get('rolldown')!.launcher.command).toBe('vite:devtools:install:rolldown')
    // …and executing that command runs the install handler.
    await ctx.commands.execute('vite:devtools:install:rolldown')
    expect(isPackageExists).toHaveBeenCalled()
  })

  it('installs only the missing packages as a tracked terminal session', async () => {
    const { ctx, startChildProcess } = fakeCtx({ viteServer: true })
    // `vitest` already present; the two devtools packages are missing.
    isPackageExists.mockImplementation((name: string) => name === 'vitest')
    addDependencyCommand.mockReturnValue('pnpm add --dev @vitejs/devtools-vitest@^0.4.1 @vitest/ui')

    await mount(ctx, {
      ...baseOptions,
      id: 'vitest',
      title: 'Vitest',
      label: 'Vitest DevTools',
      install: ['vitest', '@vitejs/devtools-vitest@^0.4.1', '@vitest/ui'],
    })

    await ctx.commands.execute('vite:devtools:install:vitest')

    expect(addDependencyCommand).toHaveBeenCalledTimes(1)
    expect(addDependencyCommand).toHaveBeenCalledWith(
      'pnpm',
      ['@vitejs/devtools-vitest@^0.4.1', '@vitest/ui'],
      { dev: true },
    )
    expect(startChildProcess).toHaveBeenCalledTimes(1)
    // Installs at the workspace root, not the nested project `cwd`.
    expect(startChildProcess).toHaveBeenCalledWith(
      { command: 'pnpm', args: ['add', '--dev', '@vitejs/devtools-vitest@^0.4.1', '@vitest/ui'], cwd: '/project' },
      expect.objectContaining({ id: 'vitest:install' }),
    )
  })

  it('checks package presence and detects the package manager at the workspace root', async () => {
    const { ctx } = fakeCtx({ viteServer: true })
    isPackageExists.mockReturnValue(true)

    await mount(ctx, baseOptions)
    await ctx.commands.execute('vite:devtools:install:rolldown')

    expect(isPackageExists).toHaveBeenCalledWith('@vitejs/devtools-rolldown', { paths: ['/project'] })
  })

  it('skips install entirely when nothing is missing', async () => {
    const { ctx, startChildProcess } = fakeCtx({ viteServer: true })
    isPackageExists.mockReturnValue(true)

    await mount(ctx, baseOptions)
    await ctx.commands.execute('vite:devtools:install:rolldown')

    expect(startChildProcess).not.toHaveBeenCalled()
  })

  it('swaps to a dev-server restart hint after installing, tracking the terminal session', async () => {
    const { ctx, registered } = fakeCtx({ viteServer: true })
    isPackageExists.mockReturnValue(false)

    await mount(ctx, baseOptions)
    await ctx.commands.execute('vite:devtools:install:rolldown')

    const dock = registered.get('rolldown')!
    expect(dock.launcher.status).toBe('success')
    expect(dock.launcher.description).toContain('Restart your dev server')
    expect(dock.launcher.buttonStart).toBe('Installed')
    // "View in Terminal" (client-side) shows whenever a session is tracked.
    expect(dock.launcher.terminalSessionId).toBe('rolldown:install')
  })

  it('uses the CLI re-run hint outside the dev server', async () => {
    const { ctx, registered } = fakeCtx({ viteServer: false })
    isPackageExists.mockReturnValue(false)

    await mount(ctx, baseOptions)
    await ctx.commands.execute('vite:devtools:install:rolldown')

    expect(registered.get('rolldown')!.launcher.description).toContain('vite-devtools')
  })

  it('throws DTK0050 and surfaces the terminal session when the install fails', async () => {
    const { ctx, registered, startChildProcess } = fakeCtx({ viteServer: true })
    isPackageExists.mockReturnValue(false)
    startChildProcess.mockResolvedValueOnce({
      getResult: () => Promise.resolve({ exitCode: 1 }),
      terminate: async () => {},
    })

    await mount(ctx, baseOptions)

    await expect(ctx.commands.execute('vite:devtools:install:rolldown')).rejects.toThrow(/Failed to install/)

    const dock = registered.get('rolldown')!
    expect(dock.launcher.status).toBe('error')
    expect(dock.launcher.terminalSessionId).toBe('rolldown:install')
  })
})
