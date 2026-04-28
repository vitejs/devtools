import type { RpcDumpRecord, RpcFunctionDefinitionAny } from 'devframe/rpc'
import {
  DEVTOOLS_RPC_DUMP_DIRNAME,
} from 'devframe/constants'
import { dumpFunctions, getRpcHandler } from 'devframe/rpc'

export interface StaticRpcDumpManifestStaticEntry {
  type: 'static'
  path: string
}

export interface StaticRpcDumpManifestQueryEntry {
  type: 'query'
  records: Record<string, string>
  fallback?: string
}

export type StaticRpcDumpManifestValue
  = | StaticRpcDumpManifestStaticEntry
    | StaticRpcDumpManifestQueryEntry
    | any

export type StaticRpcDumpManifest = Record<string, StaticRpcDumpManifestValue>

export interface StaticRpcDumpCollection {
  manifest: StaticRpcDumpManifest
  files: Record<string, any>
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
  const files: Record<string, any> = {}

  for (const definition of definitions) {
    const type = definition.type ?? 'query'

    if (type === 'static') {
      const handler = await getRpcHandler(definition, context)
      const path = makeStaticPath(definition.name)
      files[path] = {
        output: await Promise.resolve(handler()),
      }
      manifest[definition.name] = {
        type: 'static',
        path,
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
    }

    const prefix = `${definition.name}---`

    for (const [recordKey, recordOrGetter] of Object.entries(store.records)) {
      if (!recordKey.startsWith(prefix))
        continue

      const key = recordKey.slice(prefix.length)
      const record = await resolveRecord(recordOrGetter)

      if (key === 'fallback') {
        const path = makeQueryFallbackPath(definition.name)
        files[path] = record
        queryEntry.fallback = path
      }
      else {
        const path = makeQueryRecordPath(definition.name, key)
        files[path] = record
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
