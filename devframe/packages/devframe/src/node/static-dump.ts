import type { RpcDumpRecord, RpcFunctionDefinitionAny } from 'devframe/rpc'
import {
  DEVTOOLS_RPC_DUMP_DIRNAME,
} from 'devframe/constants'
import { dumpFunctions, getRpcHandler } from 'devframe/rpc'

export type StaticRpcDumpSerialization = 'json' | 'structured-clone'

export interface StaticRpcDumpManifestStaticEntry {
  type: 'static'
  path: string
  /** Encoder used when this entry's file was written. Default: `'json'`. */
  serialization?: StaticRpcDumpSerialization
}

export interface StaticRpcDumpManifestQueryEntry {
  type: 'query'
  records: Record<string, string>
  fallback?: string
  /** Encoder used when each record/fallback file was written. Default: `'json'`. */
  serialization?: StaticRpcDumpSerialization
}

export type StaticRpcDumpManifestValue
  = | StaticRpcDumpManifestStaticEntry
    | StaticRpcDumpManifestQueryEntry
    | any

export type StaticRpcDumpManifest = Record<string, StaticRpcDumpManifestValue>

export interface StaticRpcDumpFile {
  /** Whether this file was written via `JSON.stringify` or `structured-clone-es.stringify`. */
  serialization: StaticRpcDumpSerialization
  /** Function name the file belongs to — used to scope `DF0019` errors during write. */
  fnName: string
  /** Payload to encode. */
  data: unknown
}

export interface StaticRpcDumpCollection {
  manifest: StaticRpcDumpManifest
  files: Record<string, StaticRpcDumpFile>
}

function makeDumpKey(name: string): string {
  return encodeURIComponent(name.replaceAll(':', '~'))
}

function makeStaticPath(name: string): string {
  return `${DEVTOOLS_RPC_DUMP_DIRNAME}/${makeDumpKey(name)}.static.json`
}

function makeQueryRecordPath(name: string, hash: string): string {
  return `${DEVTOOLS_RPC_DUMP_DIRNAME}/${makeDumpKey(name)}.record.${hash}.json`
}

function makeQueryFallbackPath(name: string): string {
  return `${DEVTOOLS_RPC_DUMP_DIRNAME}/${makeDumpKey(name)}.fallback.json`
}

async function resolveRecord(record: RpcDumpRecord | (() => Promise<RpcDumpRecord>)): Promise<RpcDumpRecord> {
  return typeof record === 'function'
    ? await record()
    : record
}

export async function collectStaticRpcDump(
  definitions: Iterable<RpcFunctionDefinitionAny>,
  context: any,
): Promise<StaticRpcDumpCollection> {
  const manifest: StaticRpcDumpManifest = {}
  const files: Record<string, StaticRpcDumpFile> = {}

  for (const definition of definitions) {
    const type = definition.type ?? 'query'
    const serialization: StaticRpcDumpSerialization
      = definition.jsonSerializable === true ? 'json' : 'structured-clone'

    if (type === 'static') {
      const handler = await getRpcHandler(definition, context)
      const path = makeStaticPath(definition.name)
      files[path] = {
        serialization,
        fnName: definition.name,
        data: { output: await Promise.resolve(handler()) },
      }
      manifest[definition.name] = {
        type: 'static',
        path,
        serialization,
      }
      continue
    }

    if (type !== 'query')
      continue

    // Reuse dump execution semantics from devframe/rpc.
    const store = await dumpFunctions([definition], context)
    if (!(definition.name in store.definitions))
      continue

    const queryEntry: StaticRpcDumpManifestQueryEntry = {
      type: 'query',
      records: {},
      serialization,
    }

    const prefix = `${definition.name}---`

    for (const [recordKey, recordOrGetter] of Object.entries(store.records)) {
      if (!recordKey.startsWith(prefix))
        continue

      const key = recordKey.slice(prefix.length)
      const record = await resolveRecord(recordOrGetter)

      if (key === 'fallback') {
        const path = makeQueryFallbackPath(definition.name)
        files[path] = { serialization, fnName: definition.name, data: record }
        queryEntry.fallback = path
      }
      else {
        const path = makeQueryRecordPath(definition.name, key)
        files[path] = { serialization, fnName: definition.name, data: record }
        queryEntry.records[key] = path
      }
    }

    if (!Object.keys(queryEntry.records).length && !queryEntry.fallback)
      continue

    manifest[definition.name] = queryEntry
  }

  return {
    manifest,
    files,
  }
}
