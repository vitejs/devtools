import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import { describe, expect, it, vi } from 'vitest'
import { getBuildCommand, ROLLDOWN_DEVTOOLS_ENV, startBuild } from '../build-runner'

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

describe('rolldown build runner', () => {
  it('builds for production even though the dev server runs with NODE_ENV=development', () => {
    const { context } = fakeContext()
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

  it('spawns the build with the production NODE_ENV', async () => {
    const { context, startChildProcess } = fakeContext()
    await startBuild(context)
    expect(startChildProcess).toHaveBeenCalledTimes(1)
    expect(startChildProcess.mock.calls[0]![0]).toMatchObject({
      env: { NODE_ENV: 'production' },
    })
  })
})
