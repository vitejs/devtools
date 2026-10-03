import { x } from 'tinyexec'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getVitePlusVersions } from '../utils/vite-plus'

vi.mock('tinyexec', () => ({ x: vi.fn<typeof x>() }))

describe('getVitePlusVersions', () => {
  beforeEach(() => {
    vi.mocked(x).mockResolvedValue({
      exitCode: 0,
      stdout: `vp v0.2.4

Local vite-plus:
  vite-plus  v0.2.4

Tools:
  vite     v8.1.3
  oxfmt    v0.57.0
  oxlint   v1.72.0

Environment:
  oxfmt    v9.0.0
  oxlint   v9.0.0
  Node.js  v24.18.0
`,
      stderr: '',
    })
  })

  it('loads all Vite+ versions with one command', async () => {
    await expect(getVitePlusVersions('/project')).resolves.toEqual({
      vitePlus: '0.2.4',
      oxlint: '1.72.0',
      oxfmt: '0.57.0',
    })

    expect(x).toHaveBeenCalledOnce()
    expect(x).toHaveBeenCalledWith('vp', ['-V'], expect.anything())
  })
})
