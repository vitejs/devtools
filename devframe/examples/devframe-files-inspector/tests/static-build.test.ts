import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createBuild } from 'devframe/adapters/build'
import {
  DEVTOOLS_CONNECTION_META_FILENAME,
  DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME,
} from 'devframe/constants'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import devframe from '../src/devframe'
import { assertClientBuilt, makeFixtureCwd } from './_utils'

interface DumpManifest {
  [name: string]:
    | { type: 'static', path: string }
    | { type: 'query', records: Record<string, string>, fallback?: string }
}

describe('static build (CLI build surface)', () => {
  let cwd: string
  let prevCwd: string
  let outBuild: string

  beforeAll(async () => {
    assertClientBuilt()
    cwd = await makeFixtureCwd()
    // The build adapter records `process.cwd()` for the static get-cwd
    // dump; chdir into the fixture so the dump is predictable.
    prevCwd = process.cwd()
    process.chdir(cwd)
    outBuild = await mkdtemp(path.join(os.tmpdir(), 'devframe-files-inspector-build-'))
  })

  afterAll(async () => {
    process.chdir(prevCwd)
    if (cwd)
      await rm(cwd, { recursive: true, force: true })
    if (outBuild)
      await rm(outBuild, { recursive: true, force: true })
  })

  it('createBuild copies the SPA with relative asset URLs', async () => {
    await createBuild(devframe, { outDir: outBuild })

    const html = await readFile(path.join(outBuild, 'index.html'), 'utf-8')
    expect(html).toContain('<base href="./" />')
    // Same `base: './'` smoke check — proves the bundle is mount-path
    // portable. Re-deploying under any base path requires no rebuild.
    expect(html).toMatch(/src="\.\/assets\/[^"]+\.js"/)

    expect(existsSync(path.join(outBuild, 'assets'))).toBe(true)
  })

  it('writes a static-backend connection meta next to index.html', async () => {
    // The meta sits at the SPA root (not under `__devtools/`) so any
    // generic static file server (`serve`, `nginx`, `python -m http.server`)
    // can serve it as a flat tree without nested-dir exclusions.
    const meta = JSON.parse(
      await readFile(
        path.join(outBuild, DEVTOOLS_CONNECTION_META_FILENAME),
        'utf-8',
      ),
    ) as { backend: string }
    expect(meta).toMatchObject({ backend: 'static' })
    // Guard the design: nothing should land under a `__devtools/` subdir.
    expect(existsSync(path.join(outBuild, '__devtools'))).toBe(false)
  })

  it('dumps both RPC functions into the manifest', async () => {
    const manifest = JSON.parse(
      await readFile(
        path.join(outBuild, DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME),
        'utf-8',
      ),
    ) as DumpManifest

    expect(manifest['devframe-files-inspector:get-cwd']).toMatchObject({ type: 'static' })
    expect(manifest['devframe-files-inspector:list-files']).toMatchObject({ type: 'query' })

    // The list-files dump records the cwd-fixture's contents.
    const listEntry = manifest['devframe-files-inspector:list-files']
    if (!('records' in listEntry))
      throw new Error('expected query manifest entry')
    const recordPaths = Object.values(listEntry.records)
    expect(recordPaths).toHaveLength(1)
    const record = JSON.parse(
      await readFile(path.join(outBuild, recordPaths[0]), 'utf-8'),
    ) as { output: string[] }
    expect(record.output).toEqual(['README.md', 'package.json', 'sample.txt'])
  })

  it('writes spa-loader.json honoring a custom base when def.spa is set', async () => {
    // The example's devframe sets `spa: { loader: 'none' }`, which opts
    // into the spa-loader sidecar. A `--base` override should be reflected
    // verbatim in the loader descriptor without forcing a rebuild — the
    // SPA bundle itself uses runtime base discovery, so the descriptor is
    // the only place the deploy base needs to land.
    const out = await mkdtemp(path.join(os.tmpdir(), 'devframe-files-inspector-base-'))
    try {
      await createBuild(devframe, { outDir: out, base: '/custom-base/' })
      const loader = JSON.parse(
        await readFile(path.join(out, 'spa-loader.json'), 'utf-8'),
      ) as { version: number, mode: string, base: string }
      expect(loader).toEqual({ version: 1, mode: 'none', base: '/custom-base/' })
    }
    finally {
      await rm(out, { recursive: true, force: true })
    }
  })
})
