import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { getBuildCommand } from '../build-runner'

const fixtures: string[] = []

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

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
      env: { VITE_DEVTOOLS_ROLLDOWN: 'true' },
    })
  })
})
