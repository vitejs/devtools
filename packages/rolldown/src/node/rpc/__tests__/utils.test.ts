import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import process from 'node:process'
import { join } from 'pathe'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { diagnostics } from '../../diagnostics'
import { getLogsManager } from '../utils'

vi.mock('../../diagnostics', () => ({
  diagnostics: {
    RDDT0001: vi.fn(),
  },
}))

describe('getLogsManager', () => {
  const tempDirs: string[] = []

  afterEach(() => {
    vi.restoreAllMocks()
    for (const dir of tempDirs.splice(0))
      rmSync(dir, { recursive: true, force: true })
  })

  it('does not fall back to logs from the process working directory', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'vite-devtools-rolldown-root-'))
    tempDirs.push(tempDir)

    const targetRoot = join(tempDir, 'target')
    const processRoot = join(tempDir, 'launcher')
    mkdirSync(targetRoot, { recursive: true })
    mkdirSync(join(processRoot, 'node_modules', '.rolldown'), { recursive: true })
    vi.spyOn(process, 'cwd').mockReturnValue(processRoot)

    const context = { cwd: targetRoot } as ViteDevToolsNodeContext
    const manager = getLogsManager(context)

    expect(manager.dir).toBe(join(targetRoot, 'node_modules', '.rolldown'))
    expect(diagnostics.RDDT0001).toHaveBeenCalledOnce()
  })
})
