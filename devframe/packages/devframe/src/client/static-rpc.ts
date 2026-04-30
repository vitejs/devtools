import { hash } from 'ohash'

export interface StaticRpcManifestStaticEntry {
  type: 'static'
  path: string
}

export interface StaticRpcManifestQueryEntry {
  type: 'query'
  records: Record<string, string>
  fallback?: string
}

export type StaticRpcManifestEntry
  = | StaticRpcManifestStaticEntry
    | StaticRpcManifestQueryEntry
    | any

export type StaticRpcManifest = Record<string, StaticRpcManifestEntry>

export interface StaticRpcRecord {
  inputs?: any[]
  output?: any
  error?: {
    message: string
    name: string
  }
}

function isStaticEntry(value: unknown): value is StaticRpcManifestStaticEntry {
  return typeof value === 'object'
    && value !== null
    && (value as any).type === 'static'
    && typeof (value as any).path === 'string'
}

function isQueryEntry(value: unknown): value is StaticRpcManifestQueryEntry {
  return typeof value === 'object'
    && value !== null
    && (value as any).type === 'query'
    && typeof (value as any).records === 'object'
    && (value as any).records !== null
}

function isRecord(value: unknown): value is StaticRpcRecord {
  return typeof value === 'object'
    && value !== null
    && ('output' in (value as any) || 'error' in (value as any))
}

function resolveRecordOutput(record: StaticRpcRecord): any {
  if (record.error) {
    const error = new Error(record.error.message)
    error.name = record.error.name
    throw error
  }
  return record.output
}

export function createStaticRpcCaller(
  manifest: StaticRpcManifest,
  fetchJson: (path: string) => Promise<any>,
) {
  const staticCache = new Map<string, Promise<any>>()
  const queryRecordCache = new Map<string, Promise<StaticRpcRecord>>()

  async function loadStatic(entry: StaticRpcManifestStaticEntry): Promise<any> {
    if (!staticCache.has(entry.path)) {
      staticCache.set(entry.path, fetchJson(entry.path))
    }
    const data = await staticCache.get(entry.path)!
    if (isRecord(data)) {
      return resolveRecordOutput(data)
    }
    return data
  }

  async function loadQueryRecord(path: string): Promise<StaticRpcRecord> {
    if (!queryRecordCache.has(path)) {
      queryRecordCache.set(path, fetchJson(path))
    }
    return await queryRecordCache.get(path)!
  }

  async function call(functionName: string, args: any[]) {
    if (!(functionName in manifest)) {
      throw new Error(`[devtools-rpc] Function "${functionName}" not found in dump store`)
    }

    const entry = manifest[functionName]
    if (isStaticEntry(entry)) {
      if (args.length > 0) {
        throw new Error(
          `[devtools-rpc] No dump match for "${functionName}" with args: ${JSON.stringify(args)}`,
        )
      }
      return await loadStatic(entry)
    }

    if (isQueryEntry(entry)) {
      const argsHash = hash(args)
      const recordPath = entry.records[argsHash]

      if (recordPath) {
        const record = await loadQueryRecord(recordPath)
        return resolveRecordOutput(record)
      }

      if (entry.fallback) {
        const fallback = await loadQueryRecord(entry.fallback)
        return resolveRecordOutput(fallback)
      }

      throw new Error(
        `[devtools-rpc] No dump match for "${functionName}" with args: ${JSON.stringify(args)}`,
      )
    }

    if (args.length === 0) {
      return entry
    }

    throw new Error(
      `[devtools-rpc] No dump match for "${functionName}" with args: ${JSON.stringify(args)}`,
    )
  }

  return {
    call: async (functionName: string, args: any[]) => await call(functionName, args),
    callOptional: async (functionName: string, args: any[]) => {
      if (!(functionName in manifest))
        return undefined
      return await call(functionName, args)
    },
    callEvent: async (_functionName: string, _args: any[]) => {
      return undefined
    },
  }
}
