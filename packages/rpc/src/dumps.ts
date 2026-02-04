import type {
  BirpcReturn,
  RpcDefinitionsToFunctions,
  RpcDumpClientOptions,
  RpcDumpCollectionOptions,
  RpcDumpDefinition,
  RpcDumpStore,
  RpcFunctionDefinitionAny,
} from './types'
import { hash } from 'ohash'
import pLimit from 'p-limit'
import { validateDefinitions } from './validation'

function getDumpRecordKey(functionName: string, args: any[]): string {
  const argsHash = hash(args)
  return `${functionName}---${argsHash}`
}

function getDumpFallbackKey(functionName: string): string {
  return `${functionName}---fallback`
}

async function resolveGetter<T>(valueOrGetter: T | (() => Promise<T>)): Promise<T> {
  return typeof valueOrGetter === 'function'
    ? await (valueOrGetter as () => Promise<T>)()
    : valueOrGetter
}

/**
 * Collects pre-computed dumps by executing functions with their defined input combinations.
 * Static functions without dump config automatically get `{ inputs: [[]] }`.
 *
 * @example
 * ```ts
 * const store = await dumpFunctions([greet], context, { concurrency: 10 })
 * ```
 */
export async function dumpFunctions<
  T extends readonly RpcFunctionDefinitionAny[],
>(
  definitions: T,
  context?: any,
  options: RpcDumpCollectionOptions = {},
): Promise<RpcDumpStore<RpcDefinitionsToFunctions<T>>> {
  validateDefinitions(definitions)
  const concurrency = options.concurrency === true
    ? 5
    : options.concurrency === false || options.concurrency == null
      ? 1
      : options.concurrency

  const store: RpcDumpStore = {
    definitions: {},
    records: {},
  }

  // #region Definition resolution
  interface TaskResolution {
    handler: (...args: any[]) => any
    dump: RpcDumpDefinition
    definition: RpcFunctionDefinitionAny
  }

  const tasksResolutions: (() => Promise<undefined | TaskResolution>)[] = definitions.map(definition => async () => {
    if (definition.type === 'event' || definition.type === 'action') {
      return undefined
    }

    // Fresh setup results for each context to avoid caching issues
    const setupResult = definition.setup
      ? await Promise.resolve(definition.setup(context))
      : {}

    const handler = setupResult.handler || definition.handler
    if (!handler) {
      throw new Error(`[devtools-rpc] Either handler or setup function must be provided for RPC function "${definition.name}"`)
    }

    let dump = setupResult.dump ?? definition.dump
    if (!dump && definition.type === 'static') {
      dump = { inputs: [[]] }
    }

    if (!dump) {
      return undefined
    }

    if (typeof dump === 'function') {
      dump = await Promise.resolve(dump(context, handler))
    }

    // Only add to definitions if it has a dump
    store.definitions[definition.name] = {
      name: definition.name,
      type: definition.type,
    }

    return {
      handler,
      dump,
      definition,
    }
  })

  let functionsToDump: TaskResolution[] = []
  if (concurrency <= 1) {
    for (const task of tasksResolutions) {
      const resolution = await task()
      if (resolution) {
        functionsToDump.push(resolution)
      }
    }
  }
  else {
    const limit = pLimit(concurrency)
    functionsToDump = (await Promise.all(tasksResolutions.map(task => limit(task)))).filter(x => !!x)
  }
  // #endregion

  // #region Dump execution
  const dumpTasks: Array<() => Promise<void>> = []
  for (const { definition, handler, dump } of functionsToDump) {
    const { inputs, records, fallback } = dump

    // Add pre-defined records
    if (records) {
      for (const record of records) {
        const recordKey = getDumpRecordKey(definition.name, record.inputs)
        store.records[recordKey] = record
      }
    }

    // Add fallback record
    if ('fallback' in dump) {
      const fallbackKey = getDumpFallbackKey(definition.name)
      store.records[fallbackKey] = {
        inputs: [],
        output: fallback,
      }
    }

    // Add input records execution tasks
    if (inputs) {
      for (const input of inputs) {
        dumpTasks.push(async () => {
          const recordKey = getDumpRecordKey(definition.name, input)

          try {
            const output = await Promise.resolve(handler(...input))
            store.records[recordKey] = {
              inputs: input,
              output,
            }
          }
          catch (error: any) {
            store.records[recordKey] = {
              inputs: input,
              error: {
                message: error.message,
                name: error.name,
              },
            }
          }
        })
      }
    }
  }

  if (concurrency <= 1) {
    for (const task of dumpTasks) {
      await task()
    }
  }
  else {
    const limit = pLimit(concurrency)
    await Promise.all(dumpTasks.map(task => limit(task)))
  }
  // #endregion

  return store
}

/**
 * Creates a client that serves pre-computed results from a dump store.
 * Uses argument hashing to match calls to stored records.
 *
 * @example
 * ```ts
 * const client = createClientFromDump(store)
 * await client.greet('Alice')
 * ```
 */
export function createClientFromDump<T extends Record<string, any>>(
  store: RpcDumpStore<T>,
  options: RpcDumpClientOptions = {},
): BirpcReturn<T> {
  const { onMiss } = options

  const client = new Proxy({} as T, {
    get(_, functionName: string) {
      if (!(functionName in store.definitions)) {
        throw new Error(`[devtools-rpc] Function "${functionName}" not found in dump store`)
      }

      return async (...args: any[]) => {
        const recordKey = getDumpRecordKey(functionName, args)

        const recordOrGetter = store.records[recordKey]

        if (recordOrGetter) {
          const record = await resolveGetter(recordOrGetter)

          if (record.error) {
            const error = new Error(record.error.message)
            error.name = record.error.name
            throw error
          }

          if (typeof record.output === 'function') {
            return await record.output()
          }

          return record.output
        }

        onMiss?.(functionName, args)

        const fallbackKey = getDumpFallbackKey(functionName)
        if (fallbackKey in store.records) {
          const fallbackOrGetter = store.records[fallbackKey]

          const fallbackRecord = await resolveGetter(fallbackOrGetter)

          if (fallbackRecord && typeof fallbackRecord.output === 'function') {
            return await fallbackRecord.output()
          }
          if (fallbackRecord)
            return fallbackRecord.output
        }

        throw new Error(
          `[devtools-rpc] No dump match for "${functionName}" with args: ${JSON.stringify(args)}`,
        )
      }
    },
    has(_, functionName: string) {
      return functionName in store.definitions
    },
    ownKeys() {
      return Object.keys(store.definitions)
    },
    getOwnPropertyDescriptor(_, functionName: string) {
      return functionName in store.definitions
        ? { configurable: true, enumerable: true, value: undefined }
        : undefined
    },
  })

  return client as any as BirpcReturn<T>
}

/**
 * Filters function definitions to only those with dump definitions.
 * Note: Only checks the definition itself, not setup results.
 */
export function getDefinitionsWithDumps<T extends readonly RpcFunctionDefinitionAny[]>(
  definitions: T,
): RpcFunctionDefinitionAny[] {
  return definitions.filter(def => def.dump !== undefined)
}
