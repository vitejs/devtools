import { collectStaticRpcDump, createClientFromDump, dumpFunctions } from 'devframe/rpc/dump'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RolldownEventsReader } from '../../rolldown/events-reader'
import { rolldownGetAssetDetails } from '../functions/rolldown-get-asset-details'
import { rolldownGetAssetsList } from '../functions/rolldown-get-assets-list'
import { rolldownGetChunkInfo } from '../functions/rolldown-get-chunk-info'
import { rolldownGetChunksGraph } from '../functions/rolldown-get-chunks-graph'
import { rolldownGetPackageDetails } from '../functions/rolldown-get-package-details'
import { rolldownGetPackages } from '../functions/rolldown-get-packages'

const { manager } = vi.hoisted(() => ({
  manager: { list: vi.fn(), loadAssetSession: vi.fn(), loadPackageSession: vi.fn() },
}))
vi.mock('../utils', () => ({ getLogsManager: () => manager }))

const functions = [rolldownGetAssetsList, rolldownGetAssetDetails, rolldownGetChunksGraph, rolldownGetChunkInfo, rolldownGetPackages, rolldownGetPackageDetails]
const readers: RolldownEventsReader[] = []
afterEach(() => {
  readers.splice(0).forEach(reader => reader.dispose())
  vi.resetAllMocks()
})

function fixture(session: string) {
  const reader = RolldownEventsReader.get(`/static-report-test/${session}/logs.json`)
  readers.push(reader)
  const asset = { filename: `${session}.js`, size: 42, chunk_id: 0 }
  const chunk = { chunk_id: 0, name: session, imports: [], modules: [] }
  // Only fields read by these RPCs are needed; the real reader supplies the maps.
  reader.manager.assets.set(asset.filename, asset as any)
  reader.manager.chunks.set(0, chunk as any)
  reader.manager.chunkAssetMap.set(0, asset as any)
  reader.manager.packageGraphReady = true
  reader.manager.packages.set('dep', {
    package_id: 'dep',
    name: 'dep',
    version: '1.0.0',
    package_root: '/node_modules/dep',
    dependency_type: 'dependency',
    is_used: true,
    size: 42,
    modules: [],
  } as any)
  return reader
}

async function exportReport() {
  const dump = await collectStaticRpcDump(functions, {})
  const manifest = JSON.parse(JSON.stringify(dump.manifest))
  const store = await dumpFunctions(functions, {})
  return { manifest, client: createClientFromDump(JSON.parse(JSON.stringify(store))) }
}

describe('static Rolldown report', () => {
  it.each(functions.map(fn => [fn.name, fn] as const))('replays %s for every session', async (name, fn) => {
    const sessions = new Map(['first', 'second'].map(id => [id, fixture(id)]))
    manager.list.mockResolvedValue(Array.from(sessions.keys(), id => ({ id })))
    manager.loadAssetSession.mockImplementation(async id => sessions.get(id))
    manager.loadPackageSession.mockImplementation(async id => sessions.get(id))
    const { manifest, client } = await exportReport()
    expect(manifest[name]).toBeDefined()
    for (const session of sessions.keys()) {
      const input = name.endsWith('get-asset-details')
        ? { session, id: `${session}.js` }
        : name.endsWith('get-chunk-info')
          ? { session, id: 0 }
          : name.endsWith('get-package-details')
            ? { session, id: 'dep' }
            : { session }
      const { handler } = await fn.setup!({} as any)
      const live = await handler!(input as never)
      expect(live).toBeDefined()
      await expect(client[name]!(input as never)).resolves.toEqual(JSON.parse(JSON.stringify(live)))
    }
  })

  it('exports an empty session list without loading readers', async () => {
    manager.list.mockResolvedValue([])
    await exportReport()
    expect(manager.loadAssetSession).not.toHaveBeenCalled()
    expect(manager.loadPackageSession).not.toHaveBeenCalled()
  })
})
