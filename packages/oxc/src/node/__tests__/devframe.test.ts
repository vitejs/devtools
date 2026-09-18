import type { DevframeNodeContext } from 'devframe/types'
import type { ServerFunctions } from '../rpc'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { RpcFunctionsCollectorBase } from 'devframe/rpc'
import { afterEach, describe, expect, it } from 'vitest'
import { oxcDevframe } from '../devframe'

const fixtures: string[] = []

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

async function createProject() {
  const workspaceRoot = await mkdtemp(join(tmpdir(), 'oxc-monorepo-'))
  fixtures.push(workspaceRoot)
  const cwd = join(workspaceRoot, 'packages/app')
  await mkdir(cwd, { recursive: true })
  const ctx = { cwd, workspaceRoot } as DevframeNodeContext
  const rpc = new RpcFunctionsCollectorBase<ServerFunctions, DevframeNodeContext>(ctx)
  ctx.rpc = rpc as unknown as DevframeNodeContext['rpc']
  await oxcDevframe.setup!(ctx, {} as never)
  return { cwd, workspaceRoot, rpc }
}

describe('Oxc project context', () => {
  it('discovers and reads the project configs when the workspace has its own configs', async () => {
    const { cwd, workspaceRoot, rpc } = await createProject()
    const configs = [
      ['oxlint.config.ts', 'devtools-oxc:get-lint-config-file'],
      ['oxfmt.config.ts', 'devtools-oxc:get-fmt-config-file'],
    ] as const
    for (const [filename] of configs) {
      await writeFile(join(workspaceRoot, filename), 'export default { /* workspace */ }')
      await writeFile(join(cwd, filename), 'export default { /* project */ }')
    }

    const discover = await rpc.getHandler('devtools-oxc:get-config-files')
    const files = await discover()
    expect(files).toEqual(
      expect.arrayContaining(
        configs.map(([path]) =>
          expect.objectContaining({
            path,
            content: 'export default { /* project */ }',
          }),
        ),
      ),
    )
    expect(files).toHaveLength(2)
    for (const [, name] of configs) {
      const readConfig = await rpc.getHandler(name)
      await expect(readConfig()).resolves.toBe('export default { /* project */ }')
    }
  })
})
