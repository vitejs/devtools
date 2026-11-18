import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ROLLDOWN_DEVTOOLS_ENV } from '@vitejs/devtools-kit/constants'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getBuildCommand, startBuild, waitForBuild } from '../build-runner'

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
    buffer: [] as string[],
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

describe('waitForBuild', () => {
  it('returns the last 20 terminal lines without ANSI escapes for a failed build', async () => {
    const { context, startChildProcess } = fakeContext()
    await startBuild(context)
    const session = await startChildProcess.mock.results[0]!.value
    session.buffer.push('earlier output\r\n', ...Array.from({ length: 25 }, (_, i) => `\u001B[31merror ${i}\u001B[0m\r\n`))
    session.getResult.mockResolvedValue({ exitCode: 1, stdout: 'stdout', stderr: 'stderr' })

    expect(await waitForBuild()).toEqual({
      exitCode: 1,
      errorOutput: Array.from({ length: 20 }, (_, i) => `error ${i + 5}`).join('\n'),
    })
  })

  it('falls back to captured output when the terminal buffer is empty', async () => {
    const { context, startChildProcess } = fakeContext()
    await startBuild(context)
    const session = await startChildProcess.mock.results[0]!.value
    session.getResult.mockResolvedValue({ exitCode: 1, stdout: 'Building...', stderr: '\u001B[31mMissing config\u001B[0m\n' })

    expect(await waitForBuild()).toEqual({ exitCode: 1, errorOutput: 'Building...\nMissing config' })
  })

  it('keeps successful results free of error output', async () => {
    const { context, startChildProcess } = fakeContext()
    await startBuild(context)
    const session = await startChildProcess.mock.results[0]!.value
    session.getResult.mockResolvedValue({ exitCode: 0, stdout: 'Built', stderr: '' })

    expect(await waitForBuild()).toEqual({ exitCode: 0 })
  })
})
