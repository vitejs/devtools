import type { ViteDevServer } from 'vite'
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DevToolsAgent } from '../../../../agent/src'
import { DevToolsViteInspect } from '../../../../vite/src/node/inspect/plugin'
import { normalizeDevToolsConfig } from '../config'
import { DevToolsServer } from '../plugins/server'

let server: ViteDevServer | undefined
let root: string
let origin: string
let requestId = 0

afterEach(async () => {
  await server?.close()
  server = undefined
  vi.unstubAllEnvs()
  if (root)
    await rm(root, { recursive: true, force: true })
})

async function start(viteInspect = false) {
  root = await realpath(await mkdtemp(join(tmpdir(), 'rolldown-agent-')))
  await mkdir(join(root, 'node_modules/.rolldown'), { recursive: true })
  vi.stubEnv('DEVFRAME_INSTANCES_DIR', join(root, 'instances'))
  server = await createServer({
    configFile: false,
    root,
    logLevel: 'silent',
    devtools: false,
    plugins: [DevToolsAgent(), DevToolsAgent(), ...(viteInspect ? [DevToolsViteInspect()] : []), DevToolsServer({}, normalizeDevToolsConfig(true, 'localhost'))],
    server: { host: '127.0.0.1', port: 0 },
  })
  await server.listen()
  origin = new URL(server.resolvedUrls!.local[0]!).origin
}

async function rpc(method: string, params: object = {}) {
  const response = await fetch(`${origin}/__devtools/__mcp`, {
    method: 'POST',
    headers: { 'Origin': origin, 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++requestId, method, params }),
  })
  expect(response.ok).toBe(true)
  const text = await response.text()
  const body = JSON.parse(text.startsWith('event:') || text.startsWith('data:') ? text.split('\n').find(line => line.startsWith('data:'))!.slice(5) : text)
  expect(body.error).toBeUndefined()
  return body.result
}

function data(result: any) {
  expect(result.isError, JSON.stringify(result)).not.toBe(true)
  return JSON.parse(result.content[0].text)
}

describe('rolldown agent over the Vite DevTools MCP endpoint', () => {
  it('auto-exposes tools, identifies the project, validates inputs and reports missing sessions', async () => {
    await start()
    const { tools } = await rpc('tools/list')
    const tool = (suffix: string) => tools.find((entry: any) => entry.name.endsWith(`agent_${suffix}`))!
    expect(tools.filter((entry: any) => entry.name.includes('rolldown_agent_'))).toHaveLength(10)
    const call = (suffix: string, args = {}) => rpc('tools/call', { name: tool(suffix).name, arguments: args })
    expect(tool('summary').annotations.readOnlyHint).toBe(true)
    expect(tool('summary').inputSchema.properties.arg0.properties.session.type).toBe('string')
    expect(data(await call('project')).cwd).toBe(root)
    expect(data(await call('list-sessions', { arg0: {} }))).toMatchObject({ total: 0, items: [], hasMore: false })
    expect((await call('summary', { arg0: { session: '../other' } })).isError).toBe(true)
    expect((await call('list-sessions', { arg0: { limit: 101 } })).isError).toBe(true)
    expect((await call('summary', { arg0: { session: 'missing' } })).isError).toBe(true)
    expect((await call('compare', { arg0: { before: 'latest', after: 'missing' } })).isError).toBe(true)
    expect((await call('trace-dependency', { arg0: { target: { type: 'module', id: 'dep' }, maxDepth: 1000 } })).isError).toBe(true)
    expect(tools.some((entry: any) => /delete-session|rename-session|run-build|wait-for-build/.test(entry.name))).toBe(false)
  })

  it('paginates recorded builds newest first', async () => {
    await start()
    for (const [id, bytes] of [['before', 100], ['after', 140]] as const) {
      const dir = join(root, 'node_modules/.rolldown', id)
      await mkdir(dir, { recursive: true })
      await writeFile(join(dir, 'meta.json'), JSON.stringify({ action: 'SessionMeta', timestamp: bytes }))
      await writeFile(join(dir, 'logs.json'), '')
    }
    const { tools } = await rpc('tools/list')
    const name = tools.find((entry: any) => entry.name.endsWith('agent_list-sessions')).name
    const result = data(await rpc('tools/call', { name, arguments: { arg0: { limit: 1 } } }))
    expect(result.total).toBe(2)
    expect(result.items.map((session: any) => session.id)).toEqual(['after'])
  })
})

describe('vite agent over the MCP endpoint', () => {
  it('reports inactive inspection without affecting Rolldown tools', async () => {
    await start()
    const { tools } = await rpc('tools/list')
    const name = tools.find((tool: any) => tool.name.endsWith('vite_agent_environments')).name
    expect(data(await rpc('tools/call', { name }))).toEqual({ available: false, instances: [] })
  })

  it('reads recorded transforms and scopes queries to a Vite environment', async () => {
    await start(true)
    await writeFile(join(root, 'entry.js'), `export const message = "${'x'.repeat(5000)}"`)
    await server!.transformRequest('/entry.js')
    const { tools } = await rpc('tools/list')
    const call = (suffix: string, args?: object) => rpc('tools/call', {
      name: tools.find((tool: any) => tool.name.endsWith(`vite_agent_${suffix}`)).name,
      ...(args ? { arguments: { arg0: args } } : {}),
    })
    const discovery = data(await call('environments'))
    expect(discovery.available).toBe(true)
    const scope = { vite: discovery.instances[0].vite, env: 'client' }
    expect(discovery.instances[0].environments).toContain(scope.env)
    const modules = data(await call('modules', { ...scope, query: 'entry.js', limit: 1 }))
    expect(modules.items).toHaveLength(1)
    const module = modules.items[0].id
    const detail = data(await call('module', { ...scope, module }))
    expect(detail.module.id).toBe(module)
    expect(detail.module.importers.items).toEqual([])
    const transforms = data(await call('transforms', { ...scope, module }))
    expect(transforms.items.length).toBeGreaterThan(0)
    expect(transforms.items.every((step: any) => !('code' in step))).toBe(true)
    const offset = transforms.items.findIndex((step: any) => step.codeLength > 4000)
    expect(offset).toBeGreaterThanOrEqual(0)
    const first = data(await call('transforms', { ...scope, module, includeCode: true, offset, limit: 1 }))
    expect(first.items[0].code).toHaveLength(4000)
    expect(first.items[0].codeHasMore).toBe(true)
    const rest = data(await call('transforms', { ...scope, module, includeCode: true, offset, limit: 1, codeOffset: 4000 }))
    expect(first.items[0].code.length + rest.items[0].code.length).toBe(first.items[0].codeLength)
    const plugins = data(await call('plugins', { ...scope, query: 'vite:', limit: 2 }))
    expect(plugins.items.length).toBeGreaterThan(0)
    expect(plugins.items.every((plugin: any) => plugin.name.includes('vite:'))).toBe(true)
    expect((await call('modules', { ...scope, env: 'missing' })).isError).toBe(true)
    expect((await call('transforms', { ...scope, module, limit: 21 })).isError).toBe(true)
  })
})
