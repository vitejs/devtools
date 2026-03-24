import type { DevToolsNodeContext } from '@vitejs/devtools-kit'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { openInEditor } from '../rpc/public/open-in-editor'

// Mock launch-editor so tests don't actually open files
vi.mock('launch-editor', () => ({
  default: vi.fn(),
}))

describe('openInEditor – path traversal protection', () => {
  const cwd = resolve('/project/root')
  const mockContext = { cwd } as DevToolsNodeContext

  function getHandler() {
    const { handler } = openInEditor?.setup(mockContext)
    return handler
  }

  it('allows opening a file inside the project root', async () => {
    const handler = getHandler()
    await expect(handler('src/main.ts')).resolves.not.toThrow()
  })

  it('allows opening a nested file inside the project root', async () => {
    const handler = getHandler()
    await expect(handler('src/utils/helper.ts')).resolves.not.toThrow()
  })

  it('rejects path traversal with ../', async () => {
    const handler = getHandler()
    await expect(handler('../../etc/passwd')).rejects.toThrow(
      'Path is outside the project root',
    )
  })

  it('rejects absolute path outside project root', async () => {
    const handler = getHandler()
    await expect(handler('/etc/passwd')).rejects.toThrow(
      'Path is outside the project root',
    )
  })

  it('rejects traversal disguised within a subpath', async () => {
    const handler = getHandler()
    await expect(handler('src/../../secret/file.txt')).rejects.toThrow(
      'Path is outside the project root',
    )
  })
})
