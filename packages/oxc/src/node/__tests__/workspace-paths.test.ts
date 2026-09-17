import type { DevframeNodeContext } from 'devframe/types'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { launchEditor } from 'devframe/utils/launch-editor'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { openInEditor } from '../rpc/functions/open-in-editor'
import { oxfmtGetConfigFile } from '../rpc/functions/oxfmt-get-config-file'
import { oxlintGetConfigFile } from '../rpc/functions/oxlint-get-config-file'

vi.mock('devframe/utils/launch-editor', () => ({ launchEditor: vi.fn<typeof launchEditor>() }))

const fixtures: string[] = []

afterEach(async () => {
  vi.clearAllMocks()
  await Promise.all(fixtures.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

describe('project-relative RPC paths', () => {
  it.each(['', ':12', ':12:3'])('opens project files with position suffix "%s"', async suffix => {
    const cwd = join(tmpdir(), 'oxc-workspace')
    const { handler } = openInEditor.setup({ cwd } as DevframeNodeContext)

    await handler(`src/index.ts${suffix}`)

    expect(launchEditor).toHaveBeenCalledWith(join(cwd, `src/index.ts${suffix}`))
  })

  it('preserves absolute editor targets', async () => {
    const { handler } = openInEditor.setup({ cwd: '/workspace' } as DevframeNodeContext)
    const target = join(tmpdir(), 'external/index.ts:12:3')

    await handler(target)

    expect(launchEditor).toHaveBeenCalledWith(target)
  })

  it.each([
    ['oxlint.config.ts', oxlintGetConfigFile],
    ['oxfmt.config.ts', oxfmtGetConfigFile],
  ] as const)('reads %s from the context directory', async (filename, definition) => {
    const cwd = await mkdtemp(join(tmpdir(), 'oxc-workspace-config-'))
    fixtures.push(cwd)
    const content = 'export default { /* workspace config */ }'
    await writeFile(join(cwd, filename), content)
    const { handler } = definition.setup({ cwd } as DevframeNodeContext)

    await expect(handler()).resolves.toBe(content)
    await rm(join(cwd, filename))
    await expect(handler()).resolves.toBeNull()
  })
})
