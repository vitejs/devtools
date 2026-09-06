import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  getOxfmtFormatCommand,
  listOxfmtCheckResults,
  parseOxfmtCheckOutput,
  saveOxfmtCheckResult,
} from '../rpc/functions/oxfmt-run'

const fixtures: string[] = []

async function createFixture() {
  const cwd = await mkdtemp(join(tmpdir(), 'oxfmt-run-'))
  fixtures.push(cwd)
  return cwd
}

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

describe('getOxfmtFormatCommand', () => {
  it('uses Vite+ when available and Oxfmt otherwise', () => {
    expect(getOxfmtFormatCommand(false, true)).toEqual({
      command: 'vp',
      args: ['fmt', '--check'],
    })
    expect(getOxfmtFormatCommand(true, false)).toEqual({
      command: 'oxfmt',
      args: ['--write'],
    })
  })

  it('persists each parsed check under its timestamp directory', async () => {
    const cwd = await createFixture()
    await writeFile(join(cwd, '.gitignore'), '')
    const log = parseOxfmtCheckOutput(
      'Checking formatting...\n\nAll matched files use the correct format.\nFinished in 113ms on 11 files using 8 threads.',
    )!

    await saveOxfmtCheckResult(cwd, log)

    await expect(listOxfmtCheckResults(cwd)).resolves.toMatchObject([
      { status: 'clean', summary: { durationMs: 113 } },
    ])
  })
})

describe('parseOxfmtCheckOutput', () => {
  it('parses files and summary when formatting is needed', () => {
    expect(
      parseOxfmtCheckOutput(`Checking formatting...
index.html (103ms)
src/main.js (0ms)
Format issues found in above 2 files. Run without \`--check\` to fix.
Finished in 113ms on 11 files using 8 threads.`),
    ).toEqual({
      status: 'issues',
      files: [
        { path: 'index.html', durationMs: 103 },
        { path: 'src/main.js', durationMs: 0 },
      ],
      summary: { durationMs: 113, fileCount: 11, threadCount: 8 },
      stdout: `Checking formatting...
index.html (103ms)
src/main.js (0ms)
Format issues found in above 2 files. Run without \`--check\` to fix.
Finished in 113ms on 11 files using 8 threads.`,
    })
  })

  it('records failed checks even when Oxfmt does not print a summary', () => {
    expect(
      parseOxfmtCheckOutput(
        'Checking formatting...\n\nAll matched files use the correct format.\nFinished in 113ms on 11 files using 8 threads.',
      ),
    ).toMatchObject({ status: 'clean', files: [] })
    expect(parseOxfmtCheckOutput('Oxfmt failed to load config.')).toMatchObject({
      status: 'error',
      summary: { durationMs: 0, fileCount: 0, threadCount: 0 },
    })
  })
})
