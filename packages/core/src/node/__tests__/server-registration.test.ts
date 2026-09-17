import type { ViteDevServer } from 'vite'
import { mkdtemp, readdir, readFile, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { normalizeDevToolsConfig } from '../config'
import { DevToolsServer } from '../plugins/server'

describe('hub discovery', () => {
  let server: ViteDevServer | undefined
  let root: string
  let instancesDir: string

  beforeEach(async () => {
    root = await realpath(await mkdtemp(join(tmpdir(), 'devtools-registration-')))
    instancesDir = join(root, 'instances')
    vi.stubEnv('DEVFRAME_INSTANCES_DIR', instancesDir)
  })

  afterEach(async () => {
    await server?.close()
    server = undefined
    vi.unstubAllEnvs()
    await rm(root, { recursive: true, force: true })
  })

  async function start(): Promise<string> {
    server = await createServer({
      configFile: false,
      root,
      logLevel: 'silent',
      devtools: false,
      plugins: [DevToolsServer({}, normalizeDevToolsConfig({ mcp: true }, 'localhost'))],
      server: { host: '127.0.0.1', port: 0 },
    })
    await server.listen()
    const origin = new URL(server.resolvedUrls!.local[0]!).origin
    const response = await fetch(`${origin}/__devtools/__connection.json`)
    expect(response.ok).toBe(true)
    await response.json()
    return origin
  }

  async function records(): Promise<string[]> {
    return readdir(instancesDir).catch((error) => {
      if (error.code === 'ENOENT')
        return []
      throw error
    })
  }

  it('registers the actual hub endpoint by default and removes it on close', async () => {
    const origin = await start()
    await expect.poll(records).toHaveLength(1)
    const [file] = await records()
    const record = JSON.parse(await readFile(join(instancesDir, file!), 'utf8'))
    expect(record).toMatchObject({
      id: 'vite-devtools',
      name: 'Vite DevTools',
      origin,
      port: Number(new URL(origin).port),
      rootDir: root,
      basePath: '/__devtools/',
      mcp: { path: '/__devtools/__mcp' },
    })
    const response = await fetch(new URL(record.mcp.path, record.origin), {
      method: 'POST',
      headers: {
        'Origin': record.origin,
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    })
    expect(response.ok).toBe(true)
    expect(await response.text()).toContain('"tools"')
    await server!.close()
    server = undefined
    expect(await records()).toEqual([])
  })
})
