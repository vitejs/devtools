import type { ViteDevToolsNodeContext } from '../types/vite-plugin'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createInstallLauncher } from './create-install-launcher'

const { isPackageExists, addDependency } = vi.hoisted(() => ({
  isPackageExists: vi.fn(),
  addDependency: vi.fn(),
}))

vi.mock('local-pkg', () => ({ isPackageExists }))
vi.mock('nypm', () => ({ addDependency }))

interface FakeDock { id: string, type: string, launcher?: any, [k: string]: any }

function fakeCtx(opts: { viteServer?: boolean } = {}): {
  ctx: ViteDevToolsNodeContext
  registered: Map<string, FakeDock>
} {
  const registered = new Map<string, FakeDock>()
  const commandHandlers = new Map<string, (...args: any[]) => any>()
  const ctx = {
    cwd: '/project',
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
  } as unknown as ViteDevToolsNodeContext
  return { ctx, registered }
}

async function mount(ctx: ViteDevToolsNodeContext, options: Parameters<typeof createInstallLauncher>[0]): Promise<void> {
  const plugin = createInstallLauncher(options)
  await plugin.devtools!.setup!(ctx)
}

const baseOptions = {
  id: 'rolldown',
  title: 'Rolldown',
  icon: '/__devtools-assets/rolldown.svg',
  groupId: '~viteplus',
  label: 'Rolldown DevTools',
  install: ['@vitejs/devtools-rolldown@^0.4.1'],
}

beforeEach(() => {
  isPackageExists.mockReset()
  addDependency.mockReset()
})

describe('createInstallLauncher', () => {
  it('registers an idle launcher dock with install copy', async () => {
    const { ctx, registered } = fakeCtx()
    await mount(ctx, baseOptions)

    const dock = registered.get('rolldown')!
    expect(dock.type).toBe('launcher')
    expect(dock.groupId).toBe('~viteplus')
    expect(dock.launcher.status).toBe('idle')
    expect(dock.launcher.buttonStart).toBe('Install Rolldown DevTools')
    // The launch action is the bound command (the serializable path); no
    // in-process onLaunch is set.
    expect(dock.launcher.command).toBe('vite:devtools:install:rolldown')
    expect(dock.launcher.onLaunch).toBeUndefined()
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

  it('installs only the missing packages in a single dev-dependency call', async () => {
    const { ctx } = fakeCtx({ viteServer: true })
    // `vitest` already present; the two devtools packages are missing.
    isPackageExists.mockImplementation((name: string) => name === 'vitest')

    await mount(ctx, {
      ...baseOptions,
      id: 'vitest',
      title: 'Vitest',
      label: 'Vitest DevTools',
      install: ['vitest', '@vitejs/devtools-vitest@^0.4.1', '@vitest/ui'],
    })

    await ctx.commands.execute('vite:devtools:install:vitest')

    expect(addDependency).toHaveBeenCalledTimes(1)
    expect(addDependency).toHaveBeenCalledWith(
      ['@vitejs/devtools-vitest@^0.4.1', '@vitest/ui'],
      { cwd: '/project', dev: true },
    )
  })

  it('skips install entirely when nothing is missing', async () => {
    const { ctx } = fakeCtx({ viteServer: true })
    isPackageExists.mockReturnValue(true)

    await mount(ctx, baseOptions)
    await ctx.commands.execute('vite:devtools:install:rolldown')

    expect(addDependency).not.toHaveBeenCalled()
  })

  it('swaps to a dev-server restart hint after installing', async () => {
    const { ctx, registered } = fakeCtx({ viteServer: true })
    isPackageExists.mockReturnValue(false)
    addDependency.mockResolvedValue(undefined)

    await mount(ctx, baseOptions)
    await ctx.commands.execute('vite:devtools:install:rolldown')

    const dock = registered.get('rolldown')!
    expect(dock.launcher.status).toBe('success')
    expect(dock.launcher.description).toContain('Restart your dev server')
  })

  it('uses the CLI re-run hint outside the dev server', async () => {
    const { ctx, registered } = fakeCtx({ viteServer: false })
    isPackageExists.mockReturnValue(false)
    addDependency.mockResolvedValue(undefined)

    await mount(ctx, baseOptions)
    await ctx.commands.execute('vite:devtools:install:rolldown')

    expect(registered.get('rolldown')!.launcher.description).toContain('vite-devtools')
  })

  it('throws DTK0050 when the install fails', async () => {
    const { ctx } = fakeCtx({ viteServer: true })
    isPackageExists.mockReturnValue(false)
    addDependency.mockRejectedValue(new Error('network down'))

    await mount(ctx, baseOptions)

    await expect(ctx.commands.execute('vite:devtools:install:rolldown')).rejects.toThrow(/Failed to install/)
  })
})
