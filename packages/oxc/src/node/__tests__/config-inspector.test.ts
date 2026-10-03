import type { InspectConfigResult } from '@oxlint-config-inspector/core'
import type { DevframeNodeContext } from 'devframe/types'
import { inspectConfig } from '@oxlint-config-inspector/core'
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { oxlintInspectConfig } from '../rpc/functions/oxlint-inspect-config'

vi.mock('@oxlint-config-inspector/core', () => ({ inspectConfig: vi.fn<typeof inspectConfig>() }))

const fixtures: string[] = []
const result = { stats: { builtinRules: 1 } } as InspectConfigResult

async function createHandler() {
  const cwd = await mkdtemp(join(tmpdir(), 'oxc-config-inspector-'))
  fixtures.push(cwd)
  await writeFile(join(cwd, 'oxlint.config.ts'), 'export default {}')
  return {
    cwd,
    handler: oxlintInspectConfig.setup({ cwd } as DevframeNodeContext).handler,
  }
}

beforeEach(() => {
  vi.mocked(inspectConfig).mockReset().mockResolvedValue(result)
})

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

describe('oxlintInspectConfig', () => {
  it('inspects one workspace-relative config without caching', async () => {
    const { handler } = await createHandler()

    await expect(handler('oxlint.config.ts')).resolves.toBe(result)
    expect(inspectConfig).toHaveBeenCalledWith({
      cache: false,
      configFile: expect.stringMatching(/oxlint\.config\.ts$/),
      cwd: expect.any(String),
    })
  })

  it('rejects config paths outside the workspace', async () => {
    const { handler } = await createHandler()

    await expect(handler('../oxlint.config.ts')).rejects.toMatchObject({ name: 'OXDT0004' })
    expect(inspectConfig).not.toHaveBeenCalled()
  })

  it('rejects unsupported config formats', async () => {
    const { handler } = await createHandler()

    await expect(handler('oxlint.config.mts')).rejects.toMatchObject({ name: 'OXDT0004' })
    expect(inspectConfig).not.toHaveBeenCalled()
  })

  it('rejects config symlinks that resolve outside the workspace', async () => {
    const { cwd, handler } = await createHandler()
    const outside = await mkdtemp(join(tmpdir(), 'oxc-config-inspector-outside-'))
    fixtures.push(outside)
    await writeFile(join(outside, 'oxlint.config.ts'), 'export default {}')
    await symlink(outside, join(cwd, 'linked'), 'junction')

    await expect(handler('linked/oxlint.config.ts')).rejects.toMatchObject({ name: 'OXDT0004' })
    expect(inspectConfig).not.toHaveBeenCalled()
  })
})
