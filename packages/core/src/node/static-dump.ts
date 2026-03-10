import type { RpcDumpRecord, RpcFunctionDefinitionAny } from '@vitejs/devtools-rpc'
import {
  DEVTOOLS_RPC_DUMP_QUERY_DIR,
  DEVTOOLS_RPC_DUMP_QUERY_FALLBACK_FILENAME,
  DEVTOOLS_RPC_DUMP_QUERY_INDEX_FILENAME,
  DEVTOOLS_RPC_DUMP_QUERY_RECORDS_DIRNAME,
  DEVTOOLS_RPC_DUMP_STATIC_DIR,
} from '@vitejs/devtools-kit/constants'
import { dumpFunctions, getRpcHandler } from '@vitejs/devtools-rpc'

export interface StaticRpcDumpManifestStaticEntry {
  type: 'static'
  path: string
}

export interface StaticRpcDumpManifestQueryEntry {
  type: 'query'
  index: string
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

function encodeName(name: string): string {
  return encodeURIComponent(name)
}

function makeStaticPath(name: string): string {
  return `${DEVTOOLS_RPC_DUMP_STATIC_DIR}/${encodeName(name)}.json`
}

function makeQueryIndexPath(name: string): string {
  return `${DEVTOOLS_RPC_DUMP_QUERY_DIR}/${encodeName(name)}/${DEVTOOLS_RPC_DUMP_QUERY_INDEX_FILENAME}`
}

function makeQueryRecordPath(name: string, hash: string): string {
  return `${DEVTOOLS_RPC_DUMP_QUERY_DIR}/${encodeName(name)}/${DEVTOOLS_RPC_DUMP_QUERY_RECORDS_DIRNAME}/${hash}.json`
}

function makeQueryFallbackPath(name: string): string {
  return `${DEVTOOLS_RPC_DUMP_QUERY_DIR}/${encodeName(name)}/${DEVTOOLS_RPC_DUMP_QUERY_FALLBACK_FILENAME}`
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

    // Reuse dump execution semantics from @vitejs/devtools-rpc.
    const store = await dumpFunctions([definition], context)
    if (!(definition.name in store.definitions))
      continue

    const indexPath = makeQueryIndexPath(definition.name)
    const index: {
      records: Record<string, string>
      fallback?: string
    } = {
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
        index.fallback = path
      }
      else {
        const path = makeQueryRecordPath(definition.name, key)
        files[path] = record
        index.records[key] = path
      }
    }

    if (!Object.keys(index.records).length && !index.fallback)
      continue

    files[indexPath] = index
    manifest[definition.name] = {
      type: 'query',
      index: indexPath,
    }
  }

  return {
    manifest,
    files,
  }
}
