import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getPort } from 'get-port-please'
import { describe, expect, it } from 'vitest'
import { defineDevframe } from '../../types/devframe'
import { createDevServer, resolveDevServerPort } from '../dev'

function makeTmpDist(): string {
  const dir = mkdtempSync(join(tmpdir(), 'devframe-dev-'))
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>test</title>', 'utf-8')
  return dir
}

describe('adapters/dev', () => {
  it('createDevServer starts, exposes __connection.json, and closes', async () => {
    const distDir = makeTmpDist()
    const devframe = defineDevframe({
      id: 'devframe-test',
      name: 'Devframe Test',
      setup: () => {},
    })

    const host = '127.0.0.1'
    const port = await getPort({ port: 19999, host })
    const handle = await createDevServer(devframe, {
      host,
      port,
      distDir,
      openBrowser: false,
    })

    try {
      expect(handle.port).toBe(port)
      expect(handle.origin).toBe(`http://${host}:${port}`)

      const res = await fetch(`http://${host}:${port}/__connection.json`)
      expect(res.ok).toBe(true)
      const meta = await res.json()
      expect(meta).toEqual({ backend: 'websocket', websocket: port })
    }
    finally {
      await handle.close()
    }
  })

  it('createDevServer throws when no distDir is configured', async () => {
    const devframe = defineDevframe({
      id: 'devframe-test-nodist',
      name: 'No Dist',
      setup: () => {},
    })
    await expect(createDevServer(devframe, { openBrowser: false }))
      .rejects
      .toThrow(/no distDir/)
  })

  it('resolveDevServerPort honors def.cli.port as the preferred default', async () => {
    const preferred = await getPort({ port: 19500, host: '127.0.0.1' })
    const devframe = defineDevframe({
      id: 'devframe-test-port',
      name: 'Port Test',
      setup: () => {},
      cli: { port: preferred },
    })
    const port = await resolveDevServerPort(devframe, { host: '127.0.0.1' })
    expect(port).toBe(preferred)
  })

  it('resolveDevServerPort: defaultPort overrides def.cli.port', async () => {
    const override = await getPort({ port: 19600, host: '127.0.0.1' })
    const devframe = defineDevframe({
      id: 'devframe-test-port-override',
      name: 'Port Override',
      setup: () => {},
      cli: { port: 9999 },
    })
    const port = await resolveDevServerPort(devframe, {
      host: '127.0.0.1',
      defaultPort: override,
    })
    expect(port).toBe(override)
  })
})
