import type { LintResultLogs } from '../../types'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { LintResultsManager } from '../utils/lint-results-manager'
import { ensureOxcGitignored, parseOxlintOutput } from '../utils/oxlint'

const fixtures: string[] = []

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), 'oxc-lint-results-'))
  fixtures.push(root)
  return root
}

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

it('parses and persists lint results', async () => {
  const root = await createFixture()
  await writeFile(join(root, 'input.ts'), 'const answer = 42\n')
  const output = await parseOxlintOutput(
    JSON.stringify({
      diagnostics: [
        {
          filename: 'input.ts',
          severity: 'warning',
          labels: [{ span: { line: 1 } }],
        },
      ],
      number_of_files: 1,
      number_of_rules: 100,
      threads_count: 1,
      start_time: 0.01,
    }),
    root,
  )
  const manager = new LintResultsManager(join(root, '.devtools-oxc', 'lint'))
  const meta = { version: '1.0.0', timestamp: 123, summary: output.summary }
  const logs: LintResultLogs = {
    files: output.files,
    config: [
      {
        tool: 'oxlint',
        format: 'json',
        path: '.oxlintrc.json',
        content: '{}',
        source: 'oxc',
      },
      {
        tool: 'oxlint',
        format: 'ts',
        path: 'packages/app/oxlint.config.ts',
        content: 'export default {}',
        source: 'oxc',
      },
    ],
  }

  await manager.create(meta, logs)

  await expect(manager.list()).resolves.toEqual([meta])
  await expect(manager.load('123')).resolves.toEqual({ meta, logs })
  await manager.delete('123')
  await expect(manager.list()).resolves.toEqual([])
})

it('keeps an existing .devtools-oxc gitignore rule', async () => {
  const root = await createFixture()
  const gitignore = join(root, '.gitignore')
  await writeFile(gitignore, '**/.devtools-oxc/**\n')

  await ensureOxcGitignored(root)

  await expect(readFile(gitignore, 'utf-8')).resolves.toBe('**/.devtools-oxc/**\n')
})

it('does not create a missing .gitignore', async () => {
  const root = await createFixture()
  const gitignore = join(root, '.gitignore')

  await ensureOxcGitignored(root)

  await expect(readFile(gitignore, 'utf-8')).rejects.toMatchObject({ code: 'ENOENT' })
})

it('rejects JSON that is not an oxlint result', async () => {
  const root = await createFixture()
  await expect(parseOxlintOutput('{}', root)).resolves.toBeNull()
})

it('accepts the null rule count emitted by recent oxlint versions', async () => {
  const root = await createFixture()
  await expect(
    parseOxlintOutput(
      JSON.stringify({
        diagnostics: [],
        number_of_files: 1,
        number_of_rules: null,
        threads_count: 1,
        start_time: 0.01,
      }),
      root,
    ),
  ).resolves.toMatchObject({ summary: { number_of_rules: null } })
})
