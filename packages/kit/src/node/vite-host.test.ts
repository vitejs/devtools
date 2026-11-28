import type { ResolvedConfig } from 'vite'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createViteDevToolsHost } from './vite-host'

/** Only `root` is read off the Vite config by the host's storage layout. */
function storageDir(scope: 'workspace' | 'project' | 'global', workspaceRoot?: string): string {
  return createViteDevToolsHost({
    viteConfig: { root: '/repo/apps/site' } as unknown as ResolvedConfig,
    workspaceRoot,
  }).getStorageDir(scope)
}

describe('storage scopes', () => {
  it('keeps the workspace scope committable', () => {
    expect(storageDir('workspace', '/repo')).toBe(join('/repo', '.vite/devtools'))
  })

  it('places the per-checkout scope under node_modules', () => {
    expect(storageDir('project', '/repo')).toBe(join('/repo', 'node_modules/.vite-devtools'))
  })

  it('places the per-user scope in the home directory', () => {
    expect(storageDir('global', '/repo')).toBe(join(homedir(), '.vite/devtools'))
  })

  it('keeps per-checkout data out of the per-user directory', () => {
    expect(storageDir('project', '/repo')).not.toBe(storageDir('global', '/repo'))
  })

  it('falls back to the Vite root for the workspace root', () => {
    expect(storageDir('workspace')).toBe(join('/repo/apps/site', '.vite/devtools'))
  })
})
