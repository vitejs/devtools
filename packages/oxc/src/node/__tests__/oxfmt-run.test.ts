import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  getOxfmtFormatCommand,
  getOxfmtRunError,
  listOxfmtFormatResults,
  parseOxfmtFormatOutput,
  saveOxfmtFormatResult,
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

  it('returns Oxfmt diagnostics without whitespace', () => {
    expect(getOxfmtRunError('  Invalid config.\n')).toBe('Invalid config.')
    expect(getOxfmtRunError(' \n')).toBeUndefined()
  })

  it('persists each parsed check under its timestamp directory', async () => {
    const cwd = await createFixture()
    await writeFile(join(cwd, '.gitignore'), '')
    const log = parseOxfmtFormatOutput(
      'Checking formatting...\n\nAll matched files use the correct format.\nFinished in 113ms on 11 files using 8 threads.',
    )!

    await saveOxfmtFormatResult(cwd, log)

    await expect(listOxfmtFormatResults(cwd)).resolves.toMatchObject([
      { mode: 'check', status: 'clean', summary: { durationMs: 113 } },
    ])
  })
})

describe('parseOxfmtFormatOutput', () => {
  it('persists write results and uses the exit code for their status', async () => {
    const cwd = await createFixture()
    await writeFile(join(cwd, '.gitignore'), '')
    const stdout = 'src/main.ts (0.5ms)\nFinished in 2ms on 1 files using 8 threads.'
    const log = parseOxfmtFormatOutput(stdout, 'write', 0)
    expect(log).toMatchObject({
      mode: 'write',
      status: 'clean',
      files: [{ path: 'src/main.ts', durationMs: 0.5 }],
    })
    expect(parseOxfmtFormatOutput(stdout, 'write', 1).status).toBe('error')
    await saveOxfmtFormatResult(cwd, log)
    await expect(listOxfmtFormatResults(cwd)).resolves.toMatchObject([log])
  })

  it('treats legacy logs as checks and sorts their files by duration', async () => {
    const cwd = await createFixture()
    const dir = join(cwd, '.devtools-oxc', 'fmt', '1')
    await mkdir(dir, { recursive: true })
    const { mode: _mode, ...legacy } = parseOxfmtFormatOutput('')
    await writeFile(
      join(dir, 'log.json'),
      JSON.stringify({
        timestamp: 1,
        ...legacy,
        files: [
          { path: 'eslint.config.js', durationMs: 1 },
          { path: 'index.html', durationMs: 115 },
          { path: 'vite.config.js', durationMs: 2 },
        ],
      }),
    )
    await expect(listOxfmtFormatResults(cwd)).resolves.toMatchObject([
      {
        mode: 'check',
        files: [
          { path: 'index.html', durationMs: 115 },
          { path: 'vite.config.js', durationMs: 2 },
          { path: 'eslint.config.js', durationMs: 1 },
        ],
      },
    ])
  })

  it('parses files and summary when formatting is needed', () => {
    expect(
      parseOxfmtFormatOutput(`Checking formatting...
index.html (103ms)
src/main.js (200ms)
Format issues found in above 2 files. Run without \`--check\` to fix.
Finished in 113ms on 11 files using 8 threads.`),
    ).toEqual({
      mode: 'check',
      status: 'issues',
      files: [
        { path: 'src/main.js', durationMs: 200 },
        { path: 'index.html', durationMs: 103 },
      ],
      summary: { durationMs: 113, fileCount: 11, threadCount: 8 },
      stdout: `Checking formatting...
index.html (103ms)
src/main.js (200ms)
Format issues found in above 2 files. Run without \`--check\` to fix.
Finished in 113ms on 11 files using 8 threads.`,
    })
  })

  it('records failed checks even when Oxfmt does not print a summary', () => {
    expect(
      parseOxfmtFormatOutput(
        'Checking formatting...\n\nAll matched files use the correct format.\nFinished in 113ms on 11 files using 8 threads.',
      ),
    ).toMatchObject({ status: 'clean', files: [] })
    expect(parseOxfmtFormatOutput('Oxfmt failed to load config.')).toMatchObject({
      status: 'error',
      summary: { durationMs: 0, fileCount: 0, threadCount: 0 },
    })
  })
})
