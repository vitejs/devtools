import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { createBuild } from 'devframe/adapters/build'
import { serveStaticHandler } from 'devframe/utils/serve-static'
import { getPort } from 'get-port-please'
import { createApp, toNodeListener } from 'h3'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import devframe from '../src/devframe'
import { assertClientBuilt, makeFixtureCwd } from './_utils'

interface StaticServer {
  origin: string
  /** URL prefix the SPA root is served at — `/` for option A, `/myapp/` for option B. */
  mountBase: string
  close: () => Promise<void>
}

async function startStaticServer(outDir: string, mountBase: string): Promise<StaticServer> {
  const host = '127.0.0.1'
  const port = await getPort({ host, random: true })
  const app = createApp()
  app.use(mountBase, serveStaticHandler(outDir))
  const httpServer = createServer(toNodeListener(app))
  await new Promise<void>(r => httpServer.listen(port, host, () => r()))
  return {
    origin: `http://${host}:${port}`,
    mountBase,
    close: () => new Promise<void>(r => httpServer.close(() => r())),
  }
}

describe('static serve (deployed SPA contract)', () => {
  let cwd: string
  let prevCwd: string
  let outDir: string

  beforeAll(async () => {
    assertClientBuilt()
    cwd = await makeFixtureCwd()
    prevCwd = process.cwd()
    process.chdir(cwd)
    // macOS resolves `/var/folders/...` to `/private/var/folders/...`;
    // pin the test's expected value to the realpath the build will record.
    cwd = process.cwd()
    outDir = await mkdtemp(path.join(os.tmpdir(), 'devframe-files-inspector-serve-'))
    await createBuild(devframe, { outDir })
  })

  afterAll(async () => {
    process.chdir(prevCwd)
    if (cwd)
      await rm(cwd, { recursive: true, force: true })
    if (outDir)
      await rm(outDir, { recursive: true, force: true })
  })

  // The SPA discovers its connection meta + dump shards via paths
  // *relative* to `document.baseURI`. For the "deployed at root" case
  // those resolve to absolute URLs at the server root; for the "deployed
  // at a sub-path" case the same relative paths resolve under the
  // sub-path. Both must work without rebuilding the SPA — that's the
  // whole point of `vite.base: './'` plus the runtime base discovery.
  describe.each([
    { name: 'at server root', mountBase: '/' },
    { name: 'at a sub-path', mountBase: '/myapp/' },
  ])('mounted $name', ({ mountBase }) => {
    let server: StaticServer

    beforeAll(async () => {
      server = await startStaticServer(outDir, mountBase)
    })

    afterAll(async () => {
      await server?.close()
    })

    it('serves index.html with relative asset URLs', async () => {
      const res = await fetch(`${server.origin}${mountBase}`)
      expect(res.status).toBe(200)
      const html = await res.text()
      expect(html).toContain('<base href="./" />')
      expect(html).toMatch(/src="\.\/assets\/[^"]+\.js"/)
    })

    it('serves the connection meta next to index.html as { backend: "static" }', async () => {
      // This is the path the SPA fetches via relative `./__connection.json`
      // resolved against `document.baseURI`. The 404 the user originally
      // reported with `serve dist-static` was caused by the old layout
      // putting this file under `/__devtools/__connection.json`, which a
      // SPA at any non-`/__devtools/` mount could not discover.
      const res = await fetch(`${server.origin}${mountBase}__connection.json`)
      expect(res.status).toBe(200)
      const meta = await res.json() as { backend: string }
      expect(meta).toMatchObject({ backend: 'static' })
    })

    it('serves the RPC dump manifest and reachable shard records', async () => {
      const manifestRes = await fetch(`${server.origin}${mountBase}__rpc-dump/index.json`)
      expect(manifestRes.status).toBe(200)
      const manifest = await manifestRes.json() as Record<string, any>

      // get-cwd: static entry → its `path` is fetchable.
      const getCwdEntry = manifest['devframe-files-inspector:get-cwd']
      expect(getCwdEntry?.type).toBe('static')
      const getCwdRes = await fetch(`${server.origin}${mountBase}${getCwdEntry.path}`)
      expect(getCwdRes.status).toBe(200)
      const getCwdRecord = await getCwdRes.json() as { output: { cwd: string } }
      expect(getCwdRecord.output.cwd).toBe(cwd)

      // list-files: query entry → exactly one record matching the fixture.
      const listEntry = manifest['devframe-files-inspector:list-files']
      expect(listEntry?.type).toBe('query')
      const recordPaths = Object.values(listEntry.records) as string[]
      expect(recordPaths).toHaveLength(1)
      const recordRes = await fetch(`${server.origin}${mountBase}${recordPaths[0]}`)
      expect(recordRes.status).toBe(200)
      const record = await recordRes.json() as { output: string[] }
      expect(record.output).toEqual(['README.md', 'package.json', 'sample.txt'])
    })

    it('does not expose a stray `__devtools/` directory at the SPA root', async () => {
      // Regression guard: the build output is intentionally flat —
      // re-introducing a `__devtools/` subdir would create a nested
      // path the relative-base discovery in the SPA cannot reach.
      const res = await fetch(`${server.origin}${mountBase}__devtools/__connection.json`)
      expect(res.status).toBe(404)
    })
  })
})
