import { defineRpcFunction } from '@vitejs/devtools-kit'
import {
  DEVTOOLS_RPC_DUMP_QUERY_DIR,
  DEVTOOLS_RPC_DUMP_QUERY_FALLBACK_FILENAME,
  DEVTOOLS_RPC_DUMP_QUERY_INDEX_FILENAME,
  DEVTOOLS_RPC_DUMP_QUERY_RECORDS_DIRNAME,
  DEVTOOLS_RPC_DUMP_STATIC_DIR,
} from '@vitejs/devtools-kit/constants'
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
    const expectedPath = `${DEVTOOLS_RPC_DUMP_STATIC_DIR}/test%3Aget-version.json`

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
    const basePath = `${DEVTOOLS_RPC_DUMP_QUERY_DIR}/test%3Aget-item`
    const queryRecordsPath = `${basePath}/${DEVTOOLS_RPC_DUMP_QUERY_RECORDS_DIRNAME}/`
    const manifest = result.manifest['test:get-item'] as { type: 'query', index: string }
    const index = result.files[manifest.index] as {
      records: Record<string, string>
      fallback?: string
    }

    expect(manifest).toEqual({
      type: 'query',
      index: `${basePath}/${DEVTOOLS_RPC_DUMP_QUERY_INDEX_FILENAME}`,
    })
    expect(Object.keys(index.records)).toHaveLength(2)
    expect(index.fallback).toBe(`${basePath}/${DEVTOOLS_RPC_DUMP_QUERY_FALLBACK_FILENAME}`)

    const recordPaths = Object.values(index.records)
    for (const path of recordPaths) {
      expect(path.startsWith(queryRecordsPath)).toBe(true)
      expect(path in result.files).toBe(true)
    }
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
