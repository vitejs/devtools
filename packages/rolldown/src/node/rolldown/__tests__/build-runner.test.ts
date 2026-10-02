import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getBuildCommand, ROLLDOWN_DEVTOOLS_ENV, startBuild } from '../build-runner'

const fixtures: string[] = []

afterEach(async () => {
  vi.unstubAllEnvs()
  await Promise.all(fixtures.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

function fakeContext() {
  const startChildProcess = vi.fn(async (_exec: unknown, meta: { id: string }) => ({
    ...meta,
    status: 'running',
    terminate: vi.fn(async () => {}),
    getResult: vi.fn(),
  }))
  const context = {
    cwd: '/project',
    terminals: { sessions: new Map(), startChildProcess },
  } as unknown as ViteDevToolsNodeContext
  return { context, startChildProcess }
}

describe('getBuildCommand', () => {
  it.each([false, true])('selects the project CLI with Vite+ installed: %s', async (vitePlus) => {
    const root = await mkdtemp(join(tmpdir(), 'devtools-build-'))
    fixtures.push(root)
    const cwd = join(root, 'packages/app')
    await mkdir(cwd, { recursive: true })
    if (vitePlus) {
      const pkg = join(root, 'node_modules/vite-plus')
      await mkdir(pkg, { recursive: true })
      await writeFile(join(pkg, 'package.json'), JSON.stringify({ name: 'vite-plus' }))
    }
    expect(getBuildCommand({ cwd } as ViteDevToolsNodeContext)).toEqual({
      command: vitePlus ? 'vp' : 'vite',
      args: ['build'],
      cwd,
      env: { NODE_ENV: 'production', [ROLLDOWN_DEVTOOLS_ENV]: 'true' },
    })
  })

  it('builds for production even though the dev server runs with NODE_ENV=development', () => {
    const { context } = fakeContext()
    vi.stubEnv('NODE_ENV', 'development')
    // The dev server sets `NODE_ENV=development`, and the spawned build
    // inherits the dev server's env. Vite keeps an already-set `NODE_ENV`,
    // so the build must override it to get a production bundle.
    expect(getBuildCommand(context)).toEqual({
      command: 'vite',
      args: ['build'],
      cwd: '/project',
      env: { NODE_ENV: 'production', [ROLLDOWN_DEVTOOLS_ENV]: 'true' },
    })
  })
})

describe('startBuild', () => {
  it('spawns the build with the production NODE_ENV', async () => {
    const { context, startChildProcess } = fakeContext()
    await startBuild(context)
    expect(startChildProcess).toHaveBeenCalledTimes(1)
    expect(startChildProcess.mock.calls[0]![0]).toMatchObject({
      env: { NODE_ENV: 'production' },
    })
  })
})
