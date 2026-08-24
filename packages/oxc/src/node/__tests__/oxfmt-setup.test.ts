import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getOxfmtMigration, oxfmtSetup, oxfmtSetupPreview } from '../rpc/functions/oxfmt-setup'

const fixtures: string[] = []

async function createFixture() {
  const cwd = await mkdtemp(join(tmpdir(), 'oxfmt-setup-'))
  fixtures.push(cwd)
  return cwd
}

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

describe('getOxfmtMigration', () => {
  it('prefers Prettier over Biome, then detects either Biome config', async () => {
    const cwd = await createFixture()
    await writeFile(join(cwd, 'biome.json'), '{}')
    expect(getOxfmtMigration(cwd)).toBe('biome')

    await mkdir(join(cwd, 'node_modules', 'prettier'), { recursive: true })
    await writeFile(join(cwd, 'node_modules', 'prettier', 'package.json'), '{"name":"prettier"}')
    expect(getOxfmtMigration(cwd)).toBe('prettier')
  })

  it('installs Oxfmt before running the selected migration', async () => {
    const cwd = await createFixture()
    await writeFile(join(cwd, 'biome.jsonc'), '{}')
    const startChildProcess = vi
      .fn<
        (
          ...args: unknown[]
        ) => Promise<{ getResult: () => Promise<{ exitCode: number; stderr: string }> }>
      >()
      .mockResolvedValue({ getResult: async () => ({ exitCode: 0, stderr: '' }) })
    const setup = oxfmtSetup.setup!({
      cwd,
      terminals: { startChildProcess, sessions: new Map() },
    } as any)

    await setup.handler!({ migrate: true })

    expect(startChildProcess.mock.calls[0]![0].args.at(-1)).toMatch(
      /oxfmt@latest && .*oxfmt --migrate=biome/,
    )
  })

  it('uses the Prettier migration command', async () => {
    const cwd = await createFixture()
    await mkdir(join(cwd, 'node_modules', 'prettier'), { recursive: true })
    await writeFile(join(cwd, 'node_modules', 'prettier', 'package.json'), '{"name":"prettier"}')
    const startChildProcess = vi
      .fn<
        (
          ...args: unknown[]
        ) => Promise<{ getResult: () => Promise<{ exitCode: number; stderr: string }> }>
      >()
      .mockResolvedValue({ getResult: async () => ({ exitCode: 0, stderr: '' }) })
    const setup = oxfmtSetup.setup!({
      cwd,
      terminals: { startChildProcess, sessions: new Map() },
    } as any)

    await setup.handler!({ migrate: true })

    expect(startChildProcess.mock.calls[0]![0].args.at(-1)).toMatch(
      /oxfmt@latest && .*oxfmt --migrate=prettier/,
    )
  })

  it('previews initialization when migration is disabled', async () => {
    const cwd = await createFixture()
    await writeFile(join(cwd, 'biome.json'), '{}')
    const setup = oxfmtSetupPreview.setup!({ cwd } as any)

    const preview = await setup.handler!({ migrate: false })

    expect(preview).toMatchObject({
      canMigrate: true,
      migration: 'biome',
      command: expect.stringMatching(/oxfmt@latest && .*oxfmt --init/),
      gitDirty: false,
    })
  })

  it('initializes Oxfmt without a migration source', async () => {
    const cwd = await createFixture()
    const startChildProcess = vi
      .fn<
        (
          ...args: unknown[]
        ) => Promise<{ getResult: () => Promise<{ exitCode: number; stderr: string }> }>
      >()
      .mockResolvedValue({ getResult: async () => ({ exitCode: 0, stderr: '' }) })
    const setup = oxfmtSetup.setup!({
      cwd,
      terminals: { startChildProcess, sessions: new Map() },
    } as any)

    await setup.handler!({ migrate: false })

    expect(startChildProcess.mock.calls[0]![0].args.at(-1)).toMatch(
      /oxfmt@latest && .*oxfmt --init/,
    )
  })
})
