import { execFile as execFileCallback } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'
import { getOxcConfigFiles } from '../utils/config-files'

const execFile = promisify(execFileCallback)
const fixtures: string[] = []

async function createFixture() {
  const cwd = await mkdtemp(join(tmpdir(), 'oxc-config-files-'))
  fixtures.push(cwd)
  await execFile('git', ['init', '--quiet', cwd])
  return cwd
}

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

describe('getOxcConfigFiles', () => {
  it('finds every Oxlint config format', async () => {
    const cwd = await createFixture()
    const configs = [
      { format: 'json', name: '.oxlintrc.json' },
      { format: 'jsonc', name: '.oxlintrc.jsonc' },
      { format: 'js', name: 'oxlint.config.js' },
      { format: 'mjs', name: 'oxlint.config.mjs' },
      { format: 'cjs', name: 'oxlint.config.cjs' },
      { format: 'ts', name: 'oxlint.config.ts' },
      { format: 'mts', name: 'oxlint.config.mts' },
      { format: 'cts', name: 'oxlint.config.cts' },
    ]
    await Promise.all(
      configs.map(async ({ format, name }) => {
        const dir = join(cwd, format)
        await mkdir(dir)
        await writeFile(join(dir, name), format)
      }),
    )

    const files = (await getOxcConfigFiles(cwd)).filter(file => file.tool === 'oxlint')
    expect(files).toHaveLength(configs.length)
    expect(files).toEqual(
      expect.arrayContaining(
        configs.map(({ format, name }) =>
          expect.objectContaining({ path: `${format}/${name}`, format, content: format }),
        ),
      ),
    )
  })

  it('finds nested Oxlint and Oxfmt config files', async () => {
    const cwd = await createFixture()
    await mkdir(join(cwd, 'packages', 'app'), { recursive: true })
    await Promise.all([
      writeFile(join(cwd, '.oxlintrc.json'), '{}'),
      writeFile(join(cwd, 'packages', 'app', 'oxlint.config.mts'), 'export default {}'),
      writeFile(join(cwd, 'packages', 'app', '.oxfmtrc.jsonc'), '{}'),
    ])

    await expect(getOxcConfigFiles(cwd)).resolves.toEqual([
      expect.objectContaining({
        path: '.oxlintrc.json',
        tool: 'oxlint',
        format: 'json',
        content: '{}',
        source: 'oxc',
      }),
      expect.objectContaining({
        path: 'packages/app/.oxfmtrc.jsonc',
        tool: 'oxfmt',
        source: 'oxc',
      }),
      expect.objectContaining({
        path: 'packages/app/oxlint.config.mts',
        tool: 'oxlint',
        format: 'mts',
        content: 'export default {}',
        source: 'oxc',
      }),
    ])
  })

  it('skips directories ignored by .gitignore', async () => {
    const cwd = await createFixture()
    await mkdir(join(cwd, 'ignored'), { recursive: true })
    await Promise.all([
      writeFile(join(cwd, '.gitignore'), 'ignored/\n'),
      writeFile(join(cwd, 'ignored', '.oxlintrc.json'), '{}'),
    ])

    await expect(getOxcConfigFiles(cwd)).resolves.toEqual([])
  })

  it('recognizes lint and fmt fields in a Vite Plus config without loading it', async () => {
    const cwd = await createFixture()
    await writeFile(
      join(cwd, 'vite.config.ts'),
      `
      import { defineConfig } from 'vite-plus'
      export default defineConfig({ lint: {}, fmt: {} })
    `,
    )

    await expect(getOxcConfigFiles(cwd)).resolves.toEqual([
      expect.objectContaining({ path: 'vite.config.ts', tool: 'oxlint', source: 'vite-plus' }),
      expect.objectContaining({ path: 'vite.config.ts', tool: 'oxfmt', source: 'vite-plus' }),
    ])
  })
})
