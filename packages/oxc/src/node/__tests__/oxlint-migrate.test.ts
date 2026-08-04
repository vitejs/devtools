import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { needsOxlintMigration, oxlintInstall, oxlintMigrate } from '../rpc/functions/oxlint-setup'

const fixtures: string[] = []

async function createFixture() {
  const cwd = await mkdtemp(join(tmpdir(), 'oxlint-migrate-'))
  fixtures.push(cwd)
  return cwd
}

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

describe('needsOxlintMigration', () => {
  it('requires a root ESLint config and no root Oxlint config', async () => {
    const cwd = await createFixture()
    await writeFile(join(cwd, 'eslint.config.mjs'), 'export default []')
    expect(needsOxlintMigration(cwd)).toBe(true)

    await writeFile(join(cwd, 'oxlint.config.ts'), 'export default {}')
    expect(needsOxlintMigration(cwd)).toBe(false)
  })

  it('runs installation and migration in one terminal session', async () => {
    const cwd = await createFixture()
    await writeFile(join(cwd, 'eslint.config.js'), 'export default []')
    const getResult = vi
      .fn<() => Promise<{ exitCode: number; stderr: string }>>()
      .mockResolvedValue({ exitCode: 0, stderr: '' })
    const startChildProcess = vi
      .fn<(...args: unknown[]) => Promise<{ getResult: typeof getResult }>>()
      .mockResolvedValue({ getResult })
    const setup = oxlintMigrate.setup!({
      cwd,
      terminals: { startChildProcess, sessions: new Map() },
    } as any)

    await setup.handler!()

    expect(startChildProcess).toHaveBeenCalledOnce()
    expect(startChildProcess.mock.calls[0]![0].args.at(-1)).toContain(' && ')
  })

  it('installs Oxlint as a dev dependency before initializing it', async () => {
    const cwd = await createFixture()
    const startChildProcess = vi
      .fn<
        (
          ...args: unknown[]
        ) => Promise<{ getResult: () => Promise<{ exitCode: number; stderr: string }> }>
      >()
      .mockResolvedValue({ getResult: async () => ({ exitCode: 0, stderr: '' }) })
    const setup = oxlintInstall.setup!({
      cwd,
      terminals: { startChildProcess, sessions: new Map() },
    } as any)

    await setup.handler!()

    expect(startChildProcess.mock.calls[0]![0].args.at(-1)).toMatch(
      /oxlint@latest && .*oxlint --init/,
    )
  })
})
