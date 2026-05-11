import { defineRpcFunction } from 'devframe'
import { DEVTOOLS_RPC_DUMP_DIRNAME } from 'devframe/constants'
import { strictJsonStringify } from 'devframe/rpc'
import { structuredCloneDeserialize, structuredCloneStringify } from 'devframe/utils/structured-clone'
import { describe, expect, it } from 'vitest'
import { collectStaticRpcDump } from '../static-dump'

describe('collectStaticRpcDump', () => {
  it('tags entries as JSON when jsonSerializable: true is declared', async () => {
    const getVersion = defineRpcFunction({
      name: 'test:json-version',
      type: 'static',
      jsonSerializable: true,
      handler: () => '1.0.0',
    })

    const result = await collectStaticRpcDump([getVersion], {})
    const expectedPath = `${DEVTOOLS_RPC_DUMP_DIRNAME}/test~json-version.static.json`

    expect(result.manifest['test:json-version']).toEqual({
      type: 'static',
      path: expectedPath,
      serialization: 'json',
    })
    expect(result.files[expectedPath]?.serialization).toBe('json')
  })

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
      // Default `jsonSerializable: false` → structured-clone-encoded shard.
      serialization: 'structured-clone',
    })
    expect(result.files[expectedPath]).toEqual({
      serialization: 'structured-clone',
      fnName: 'test:get-version',
      data: { output: '1.0.0' },
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
      serialization: 'structured-clone',
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

  describe('structured-clone dumps', () => {
    it('keeps Map/Set values intact in the in-memory file payload', async () => {
      const getGraph = defineRpcFunction({
        name: 'test:graph',
        type: 'static',
        // jsonSerializable: false (default) — fancy types must survive
        handler: () => ({
          nodes: new Map([['a', 1], ['b', 2]]),
          tags: new Set(['x', 'y']),
        }),
      })

      const result = await collectStaticRpcDump([getGraph], {})
      const path = `${DEVTOOLS_RPC_DUMP_DIRNAME}/test~graph.static.json`
      const file = result.files[path]!

      expect(file.serialization).toBe('structured-clone')
      const output = (file.data as { output: { nodes: Map<string, number>, tags: Set<string> } }).output
      expect(output.nodes).toBeInstanceOf(Map)
      expect(output.nodes.get('a')).toBe(1)
      expect(output.tags).toBeInstanceOf(Set)
      expect(output.tags.has('x')).toBe(true)
    })

    it('survives a full write→read round-trip (Map preserved end-to-end)', async () => {
      // Mirrors what `createBuild` does: collect, sc-stringify the file
      // payload, write JSON text to disk. The static client later reads
      // the JSON and revives via `structuredCloneDeserialize`.
      const getMap = defineRpcFunction({
        name: 'test:roundtrip-map',
        type: 'static',
        handler: () => new Map<string, number>([['k', 42]]),
      })

      const result = await collectStaticRpcDump([getMap], {})
      const path = `${DEVTOOLS_RPC_DUMP_DIRNAME}/test~roundtrip-map.static.json`
      const file = result.files[path]!

      // Server side: write to disk as sc-encoded text.
      const wireText = structuredCloneStringify(file.data)
      // Client side: fetch().json() (i.e. JSON.parse) + structuredCloneDeserialize revive.
      const revived = structuredCloneDeserialize(JSON.parse(wireText)) as { output: Map<string, number> }
      expect(revived.output).toBeInstanceOf(Map)
      expect(revived.output.get('k')).toBe(42)
    })

    it('encodes query records and fallback as structured-clone when default', async () => {
      const getEntries = defineRpcFunction({
        name: 'test:entries',
        type: 'query',
        // default jsonSerializable: false → sc shards.
        handler: (key: string) => new Map([[key, key.length]]),
        dump: {
          inputs: [['hello']],
          fallback: new Map([['_', 0]]),
        },
      })

      const result = await collectStaticRpcDump([getEntries], {})
      const fallbackPath = `${DEVTOOLS_RPC_DUMP_DIRNAME}/test~entries.fallback.json`
      const fallback = result.files[fallbackPath]!
      expect(fallback.serialization).toBe('structured-clone')

      // Round-trip the fallback shard.
      const revived = structuredCloneDeserialize(JSON.parse(structuredCloneStringify(fallback.data))) as { output: Map<string, number> }
      expect(revived.output).toBeInstanceOf(Map)
      expect(revived.output.get('_')).toBe(0)

      // And one of the input records.
      const recordPath = Object.values(
        (result.manifest['test:entries'] as { records: Record<string, string> }).records,
      )[0]!
      const record = result.files[recordPath]!
      expect(record.serialization).toBe('structured-clone')
      const revivedRecord = structuredCloneDeserialize(JSON.parse(structuredCloneStringify(record.data))) as { output: Map<string, number> }
      expect(revivedRecord.output.get('hello')).toBe(5)
    })

    it('writes plain JSON when jsonSerializable: true is declared', async () => {
      const getList = defineRpcFunction({
        name: 'test:json-list',
        type: 'static',
        jsonSerializable: true,
        handler: () => ['a', 'b', 'c'],
      })

      const result = await collectStaticRpcDump([getList], {})
      const path = `${DEVTOOLS_RPC_DUMP_DIRNAME}/test~json-list.static.json`
      const file = result.files[path]!

      expect(file.serialization).toBe('json')
      // Strict JSON serializer round-trips losslessly via JSON.parse.
      const wireText = strictJsonStringify(file.data, file.fnName)
      expect(JSON.parse(wireText)).toEqual({ output: ['a', 'b', 'c'] })
    })

    it('throws DF0019 at build time when a JSON-flagged fn returns non-JSON', async () => {
      const getMapJson = defineRpcFunction({
        name: 'test:bad-json',
        type: 'static',
        jsonSerializable: true,
        // Lying about the contract: handler returns a Map.
        handler: () => new Map([['k', 1]]) as any,
      })

      const result = await collectStaticRpcDump([getMapJson], {})
      const path = `${DEVTOOLS_RPC_DUMP_DIRNAME}/test~bad-json.static.json`
      const file = result.files[path]!

      // collectStaticRpcDump records the value as-is; the strict
      // serializer throws when build.ts tries to write it.
      expect(() => strictJsonStringify(file.data, file.fnName))
        .toThrowError(/jsonSerializable: true.*is a Map/)
    })
  })
})
