import type { DevToolsNodeContext } from '@vitejs/devtools-kit'
import { resolve } from 'node:path'
import { launchEditor } from 'devframe/utils/launch-editor'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { openInEditor } from '../rpc/public/open-in-editor'

// Mock launch-editor so tests don't actually open files
vi.mock('devframe/utils/launch-editor', () => ({
  launchEditor: vi.fn(),
}))

describe('openInEditor – path traversal protection', () => {
  const cwd = resolve('/project/root')
  const workspaceRoot = resolve('/project')
  const mockContext = { cwd, workspaceRoot } as DevToolsNodeContext

  async function getHandler() {
    const setup = openInEditor.setup!
    const { handler } = await setup(mockContext)
    expect(handler).toBeTypeOf('function')
    return handler as (path: string) => Promise<void>
  }

  beforeEach(() => {
    vi.mocked(launchEditor).mockClear()
  })

  it('allows opening a file inside the project root', async () => {
    const handler = await getHandler()
    await expect(handler('src/main.ts')).resolves.not.toThrow()
  })

  it('allows opening a nested file inside the project root', async () => {
    const handler = await getHandler()
    await expect(handler('src/utils/helper.ts')).resolves.not.toThrow()
  })

  it('resolves relative paths against cwd (Vite project root), not workspaceRoot', async () => {
    const handler = await getHandler()
    await handler('src/main.ts')
    expect(launchEditor).toHaveBeenCalledWith(resolve(cwd, 'src/main.ts'))
  })

  it('allows jumping to sibling packages within the workspace root', async () => {
    const handler = await getHandler()
    await expect(handler('../sibling-pkg/src/foo.ts')).resolves.not.toThrow()
    expect(launchEditor).toHaveBeenCalledWith(resolve(workspaceRoot, 'sibling-pkg/src/foo.ts'))
  })

  it('rejects path traversal with ../', async () => {
    const handler = await getHandler()
    await expect(handler('../../etc/passwd')).rejects.toThrow(
      'Path is outside the workspace root',
    )
  })

  it('rejects absolute path outside project root', async () => {
    const handler = await getHandler()
    await expect(handler('/etc/passwd')).rejects.toThrow(
      'Path is outside the workspace root',
    )
  })

  it('rejects traversal disguised within a subpath', async () => {
    const handler = await getHandler()
    await expect(handler('src/../../../secret/file.txt')).rejects.toThrow(
      'Path is outside the workspace root',
    )
  })
})
