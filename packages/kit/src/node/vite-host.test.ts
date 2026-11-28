import type { ResolvedConfig } from 'vite'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
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

describe('legacy storage', () => {
  it('reports where earlier versions kept each scope', () => {
    const host = createViteDevToolsHost({
      viteConfig: { root: '/repo/apps/site' } as unknown as ResolvedConfig,
      workspaceRoot: '/repo',
    })
    expect(host.getLegacyStorageDir('workspace')).toBe(join('/repo', 'node_modules/.vite/devtools'))
    expect(host.getLegacyStorageDir('project')).toBe(join(homedir(), '.vite/devtools'))
    expect(host.getLegacyStorageDir('global')).toBe(join(homedir(), '.vite/devtools'))
  })
})

describe('workspace storage migration', () => {
  const roots: string[] = []
  const freshRoot = (): string => {
    const root = mkdtempSync(join(tmpdir(), 'devtools-storage-'))
    roots.push(root)
    return root
  }
  const hostFor = (root: string) => createViteDevToolsHost({
    viteConfig: { root } as unknown as ResolvedConfig,
    workspaceRoot: root,
  })

  afterEach(() => {
    for (const root of roots.splice(0))
      rmSync(root, { recursive: true, force: true })
  })

  it('moves workspace data written by earlier versions', () => {
    const root = freshRoot()
    const legacy = join(root, 'node_modules/.vite/devtools')
    mkdirSync(join(legacy, 'data-inspector'), { recursive: true })
    writeFileSync(join(legacy, 'data-inspector/queries.json'), '{"queries":{}}')

    const host = hostFor(root)
    host.migrateStorage()
    host.migrateStorage()

    expect(readFileSync(join(root, '.vite/devtools/data-inspector/queries.json'), 'utf-8')).toBe('{"queries":{}}')
    expect(existsSync(legacy)).toBe(false)
  })

  it('leaves the per-checkout directory alone', () => {
    const root = freshRoot()
    const legacy = join(root, 'node_modules/.vite/devtools')
    mkdirSync(legacy, { recursive: true })
    writeFileSync(join(legacy, 'shared.json'), 'from the old workspace scope')
    const project = join(root, 'node_modules/.vite-devtools')
    mkdirSync(project, { recursive: true })
    writeFileSync(join(project, 'private.json'), 'written by this version')

    hostFor(root).migrateStorage()

    expect(readFileSync(join(project, 'private.json'), 'utf-8')).toBe('written by this version')
    expect(existsSync(join(project, 'shared.json'))).toBe(false)
  })

  it('does nothing when there is nothing to migrate', () => {
    const root = freshRoot()

    hostFor(root).migrateStorage()

    expect(existsSync(join(root, '.vite/devtools'))).toBe(false)
  })

  it('finishes an interrupted migration', () => {
    const root = freshRoot()
    const claimed = join(root, 'node_modules/.vite/devtools.migrating')
    mkdirSync(claimed, { recursive: true })
    writeFileSync(join(claimed, 'settings.json'), '{}')

    hostFor(root).migrateStorage()

    expect(existsSync(join(root, '.vite/devtools/settings.json'))).toBe(true)
    expect(existsSync(claimed)).toBe(false)
  })
})
