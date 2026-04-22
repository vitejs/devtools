import { defineRpcFunction } from 'takubox'
import { DEVTOOLS_RPC_DUMP_DIRNAME } from 'takubox/constants'
import { describe, expect, it } from 'vitest'
import { collectStaticRpcDump } from '../static-dump'

describe('collectStaticRpcDump', () => {
  it('collects static rpc output into sharded file entries', async () => {
    const getVersion = defineRpcFunction({
      name: 'test:get-version',
      type: 'static',
      handler: () => '1.0.0',
    })

    const result = await collectStaticRpcDump([getVersion], {})
    const expectedPath = `${DEVTOOLS_RPC_DUMP_DIRNAME}/test~get-version.static.json`

    expect(result.manifest['test:get-version']).toEqual({
      type: 'static',
      path: expectedPath,
    })
    expect(result.files[expectedPath]).toEqual({
      output: '1.0.0',
    })
  })

  it('collects query dumps with records and fallback shards', async () => {
    const getItem = defineRpcFunction({
      name: 'test:get-item',
      type: 'query',
      handler: (id: string) => ({ id }),
      dump: {
        inputs: [
          ['a'],
          ['b'],
        ],
        fallback: null,
      },
    })

    const result = await collectStaticRpcDump([getItem], {})
    const basePath = `${DEVTOOLS_RPC_DUMP_DIRNAME}/test~get-item`
    const manifest = result.manifest['test:get-item'] as {
      type: 'query'
      records: Record<string, string>
      fallback?: string
    }

    expect(manifest).toEqual({
      type: 'query',
      records: expect.any(Object),
      fallback: `${basePath}.fallback.json`,
    })
    expect(Object.keys(manifest.records)).toHaveLength(2)

    const recordPaths = Object.values(manifest.records)
    for (const path of recordPaths) {
      expect(path.startsWith(`${basePath}.record.`)).toBe(true)
      expect(path.endsWith('.json')).toBe(true)
      expect(path in result.files).toBe(true)
    }

    expect(Object.keys(result.files).some(path => path.endsWith('.index.json'))).toBe(false)
  })

  it('skips query functions without dump config', async () => {
    const getLive = defineRpcFunction({
      name: 'test:get-live',
      type: 'query',
      handler: () => ({ ok: true }),
    })

    const result = await collectStaticRpcDump([getLive], {})

    expect(result.manifest).toEqual({})
    expect(result.files).toEqual({})
  })
})
