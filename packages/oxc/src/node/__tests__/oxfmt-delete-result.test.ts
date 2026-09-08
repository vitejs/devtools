import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { oxfmtDeleteResult } from '../rpc/functions/oxfmt-delete-result'

it('deletes only the selected log and rejects invalid or missing IDs', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'oxfmt-delete-'))
  try {
    for (const [id, mode] of [
      ['1', 'check'],
      ['2', 'write'],
    ]) {
      const dir = join(cwd, '.devtools-oxc', 'fmt', id)
      await mkdir(dir, { recursive: true })
      await writeFile(join(dir, 'log.json'), JSON.stringify({ mode }))
    }
    const source = join(cwd, 'index.ts')
    await writeFile(source, 'export const value = 1\n')
    const { handler } = oxfmtDeleteResult.setup!({ cwd } as any)
    for (const resultId of ['../..', '', '/tmp', '1/../../..']) {
      await expect(handler({ resultId })).rejects.toMatchObject({ code: 'OXDT0008' })
    }
    await handler({ resultId: '2' })
    await expect(readFile(join(cwd, '.devtools-oxc/fmt/2/log.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
    await expect(readFile(join(cwd, '.devtools-oxc/fmt/1/log.json'), 'utf8')).resolves.toContain(
      'check',
    )
    await expect(readFile(source, 'utf8')).resolves.toBe('export const value = 1\n')
    await expect(handler({ resultId: '2' })).rejects.toMatchObject({ code: 'OXDT0008' })
    await handler({ resultId: '1' })
    await expect(readFile(join(cwd, '.devtools-oxc/fmt/1/log.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})
