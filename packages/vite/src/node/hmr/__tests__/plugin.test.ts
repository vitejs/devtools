import type { EnvironmentModuleNode, Plugin, ResolvedConfig } from 'vite'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createHmrTrackerPlugin } from '../plugin'
import { createHmrTracker } from '../tracker'

function moduleNode(id: string, selfAccepting = false): EnvironmentModuleNode {
  return {
    id,
    url: id,
    type: 'js',
    isSelfAccepting: selfAccepting,
    importers: new Set(),
    acceptedHmrDeps: new Set(),
    acceptedHmrExports: null,
  } as EnvironmentModuleNode
}

function hook<T extends (...args: any[]) => any>(value: T | { handler: T } | undefined): T {
  return typeof value === 'function' ? value : value!.handler
}

describe('hMR tracking plugin', () => {
  let workspace: string
  let tracker: ReturnType<typeof createHmrTracker>
  let plugin: Plugin

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), 'devtools-hmr-'))
    writeFileSync(join(workspace, 'pnpm-workspace.yaml'), 'packages:\n  - apps/*\n')
    mkdirSync(join(workspace, 'apps/client'), { recursive: true })
    tracker = createHmrTracker()
    plugin = createHmrTrackerPlugin(tracker)
    // Vite invokes configuration and HMR hooks with separate context objects.
    Reflect.apply(hook(plugin.configResolved), {}, [{ root: join(workspace, 'apps/client') } as ResolvedConfig])
  })

  afterEach(() => rmSync(workspace, { recursive: true, force: true }))

  function update(modules: EnvironmentModuleNode[]) {
    Reflect.apply(hook(plugin.hotUpdate), {}, [{
      type: 'update',
      file: modules[0]!.id,
      modules,
      timestamp: 1000,
    }])
    return tracker.getUpdates()[0]!
  }

  it('records paths relative to the workspace, across hook contexts', () => {
    const source = moduleNode(join(workspace, 'apps/client/src/main.ts'), true)
    const result = update([source])
    expect(result.files).toEqual(['apps/client/src/main.ts'])
    expect(result.modules).toEqual(result.files)
    expect(result.boundaries).toEqual(result.files)
  })

  it('marks a self-accepting importer as a boundary and stops there', () => {
    const source = moduleNode(join(workspace, 'dep.ts'))
    const boundary = moduleNode(join(workspace, 'component.vue'), true)
    source.importers.add(boundary)
    boundary.importers.add(moduleNode(join(workspace, 'app.ts')))
    const result = update([source])
    expect(result.boundaries).toEqual(['component.vue'])
    expect(result.graph.nodes.map(({ id, type }) => ({ id, type }))).toEqual([
      { id: 'dep.ts', type: 'source' },
      { id: 'component.vue', type: 'boundary' },
    ])
    expect(result.graph.edges).toEqual([{ from: 'component.vue', to: 'dep.ts' }])
  })

  it('preserves the boundary role when an importer is also an updated module', () => {
    const source = moduleNode(join(workspace, 'dep.ts'))
    const boundary = moduleNode(join(workspace, 'component.vue'), true)
    source.importers.add(boundary)
    const result = update([source, boundary])
    expect(result.graph.nodes.find(node => node.id === 'component.vue')?.type).toBe('boundary')
  })

  it('stops at a dependency-accepting boundary', () => {
    const source = moduleNode(join(workspace, 'dep.ts'))
    const boundary = moduleNode(join(workspace, 'accept.ts'))
    boundary.acceptedHmrDeps.add(source)
    source.importers.add(boundary)
    const result = update([source])
    expect(result.boundaries).toEqual(['accept.ts'])
    expect(result.graph.nodes.find(node => node.id === 'accept.ts')).toMatchObject({
      type: 'boundary',
      acceptedDeps: ['dep.ts'],
    })
  })
})
