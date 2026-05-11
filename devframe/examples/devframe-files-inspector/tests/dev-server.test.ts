import type { InspectorServer } from './_utils'
import { rm } from 'node:fs/promises'
import { createRpcClient } from 'devframe/rpc/client'
import { createWsRpcChannel } from 'devframe/rpc/transports/ws-client'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { WebSocket } from 'ws'
import {
  assertClientBuilt,

  makeFixtureCwd,
  startInspectorServer,
} from './_utils'

vi.stubGlobal('WebSocket', WebSocket)

describe('dev-server (CLI surface)', () => {
  let cwd: string
  let server: InspectorServer

  beforeAll(async () => {
    assertClientBuilt()
    cwd = await makeFixtureCwd()
    server = await startInspectorServer({ cwd })
  })

  afterAll(async () => {
    await server?.close()
    if (cwd)
      await rm(cwd, { recursive: true, force: true })
  })

  it('serves index.html with relative asset URLs at the devframe base', async () => {
    const res = await fetch(`${server.origin}${server.basePath}`)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('<base href="./" />')
    // Vite's `base: './'` produces `src="./assets/...js"`.
    expect(html).toMatch(/src="\.\/assets\/[^"]+\.js"/)
  })

  it('serves the connection meta at the SPA root pointing at the WebSocket backend', async () => {
    // The meta sits next to index.html so the SPA can discover it via a
    // relative `./__connection.json` fetch — same lookup whether the
    // devframe is mounted at `/`, `/__devframe-files-inspector/`, or any
    // other base.
    const res = await fetch(
      `${server.origin}${server.basePath}__connection.json`,
    )
    expect(res.status).toBe(200)
    const meta = await res.json() as { backend: string, websocket: number }
    expect(meta.backend).toBe('websocket')
    expect(meta.websocket).toBe(server.port)
  })

  it('answers list-files and get-cwd over WebSocket RPC', async () => {
    const channel = createWsRpcChannel({
      url: `ws://127.0.0.1:${server.port}`,
      authToken: 'test',
    })
    const rpc = createRpcClient<any, any>({}, { channel })

    const cwdResult = await rpc.$call('devframe-files-inspector:get-cwd')
    expect(cwdResult).toEqual({ cwd })

    const files = await rpc.$call('devframe-files-inspector:list-files')
    expect(files).toEqual(['README.md', 'package.json', 'sample.txt'])
  })
})
