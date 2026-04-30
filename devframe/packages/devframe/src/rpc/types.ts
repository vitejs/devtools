import type { GenericSchema } from 'valibot'
import type { InferArgsType, InferReturnType } from './utils'

export type { BirpcFn, BirpcReturn } from 'birpc'

export type Thenable<T> = T | Promise<T>

export type EntriesToObject<T extends readonly [string, any][]> = {
  [K in T[number] as K[0]]: K[1]
}

/**
 * Type of the RPC function,
 * - static: A function that returns a static data, no arguments (can be cached and dumped)
 * - action: A function that performs an action (no data returned)
 * - event: A function that emits an event (no data returned), and does not wait for a response
 * - query: A function that queries a resource
 *
 * By default, the function is a query function.
 */
export type RpcFunctionType = 'static' | 'action' | 'event' | 'query'

/**
 * Agent exposure settings for an RPC function. When this field is set,
 * the function is surfaced to agents (e.g. via the devframe MCP adapter)
 * as a callable tool. Functions without an `agent` field are not exposed —
 * default-deny.
 *
 * @experimental The agent-native surface is experimental and may change
 * without a major version bump until it stabilizes.
 */
export interface RpcFunctionAgentOptions {
  /**
   * Human-readable description shown to the agent. Required — agents
   * rely on this to decide when to invoke the tool. Keep it to ~1–3
   * sentences explaining what the tool does and when to use it.
   */
  description: string
  /**
   * Optional human-friendly display title. Maps to the MCP tool `title`
   * annotation. Falls back to the RPC function `name` when omitted.
   */
  title?: string
  /**
   * Safety classification. Drives MCP annotations (`readOnlyHint`,
   * `destructiveHint`) downstream.
   * - `'read'` — no side effects; safe to call freely.
   * - `'action'` — mutates state but not destructive.
   * - `'destructive'` — may perform destructive updates.
   *
   * When omitted it is inferred from the function `type`:
   *   - `'static'` / `'query'` → `'read'`
   *   - `'action'` / `'event'` → `'action'`
   */
  safety?: 'read' | 'action' | 'destructive'
  /** Free-form tags for grouping or filtering. */
  tags?: readonly string[]
  /**
   * Optional example invocations shown to agents. Returned verbatim in
   * the agent manifest.
   */
  examples?: readonly { args: unknown[], description?: string }[]
}

/**
 * Manages dynamic function registration and provides a type-safe proxy for accessing functions.
 */
export interface RpcFunctionsCollector<LocalFunctions, SetupContext = undefined> {
  /** User-provided context passed to setup functions */
  context: SetupContext
  /** Type-safe proxy for calling registered functions */
  readonly functions: LocalFunctions
  /** Map of registered function definitions keyed by function name */
  readonly definitions: Map<string, RpcFunctionDefinitionAnyWithContext<SetupContext>>
  /** Register a new function definition */
  register: (fn: RpcFunctionDefinitionAnyWithContext<SetupContext>) => void
  /** Update an existing function definition */
  update: (fn: RpcFunctionDefinitionAnyWithContext<SetupContext>) => void
  /** Subscribe to function changes, returns unsubscribe function */
  onChanged: (fn: (id?: string) => void) => (() => void)
}

/**
 * Result returned by a function's setup method.
 */
export interface RpcFunctionSetupResult<
  ARGS extends any[],
  RETURN = void,
> {
  /** Function handler */
  handler?: (...args: ARGS) => RETURN
  /** Optional dump definition (overrides definition-level dump) */
  dump?: RpcDumpDefinition<ARGS, RETURN>
}

/** Valibot schema array for validating function arguments */
export type RpcArgsSchema = readonly GenericSchema[]
/** Valibot schema for validating function return value */
export type RpcReturnSchema = GenericSchema

/**
 * Single record in a dump store with pre-computed results.
 */
export interface RpcDumpRecord<ARGS extends any[] = any[], RETURN = any> {
  /** Function arguments */
  inputs: ARGS
  /** Result (value or lazy function) */
  output?: RETURN
  /** Error if execution failed */
  error?: {
    /** Error message */
    message: string
    /** Error type name (e.g., "Error", "TypeError") */
    name: string
  }
}

/**
 * Defines argument combinations to pre-compute for a function.
 */
export interface RpcDumpDefinition<ARGS extends any[] = any[], RETURN = any> {
  /** Argument combinations to pre-compute by executing handler */
  inputs?: ARGS[]
  /** Pre-computed records to use directly (bypasses handler execution) */
  records?: RpcDumpRecord<ARGS, RETURN>[]
  /** Fallback value when no match found */
  fallback?: RETURN
}

/**
 * Dynamically generates dump definitions based on context.
 */
export type RpcDumpGetter<ARGS extends any[] = any[], RETURN = any, CONTEXT = any>
  = (context: CONTEXT, handler: (...args: ARGS) => RETURN) => Thenable<RpcDumpDefinition<ARGS, RETURN>>

/**
 * Dump configuration (static object or dynamic function).
 */
export type RpcDump<ARGS extends any[] = any[], RETURN = any, CONTEXT = any>
  = | RpcDumpDefinition<ARGS, RETURN>
    | RpcDumpGetter<ARGS, RETURN, CONTEXT>

/**
 * Base function definition metadata.
 */
export interface RpcFunctionDefinitionBase {
  /** Function name (unique identifier) */
  name: string
  /** Function type (static, action, event, or query) */
  type?: RpcFunctionType
}

/**
 * Dump store containing pre-computed results.
 * Flat structure for serialization and efficient lookups.
 */
export interface RpcDumpStore<T = any> {
  /** Function definitions keyed by name */
  definitions: Record<string, RpcFunctionDefinitionBase>
  /** Records keyed by '<function-name>---<hash>' or '<function-name>---fallback' */
  records: Record<string, RpcDumpRecord | (() => Promise<RpcDumpRecord>)>
  /** @internal */
  _functions?: T
}

/**
 * Dump client options.
 */
export interface RpcDumpClientOptions {
  /** Called when arguments don't match any pre-computed entry */
  onMiss?: (functionName: string, args: any[]) => void
}

/**
 * Options for collecting dumps.
 */
export interface RpcDumpCollectionOptions {
  /**
   * Concurrency control for parallel execution.
   * - `false` or `undefined`: sequential execution (default)
   * - `true`: parallel execution with concurrency limit of 5
   * - `number`: parallel execution with specified concurrency limit
   */
  concurrency?: boolean | number | null
}

/**
 * RPC function definition with optional dump support.
 */
export type RpcFunctionDefinition<
  NAME extends string,
  TYPE extends RpcFunctionType = 'query',
  ARGS extends any[] = [],
  RETURN = void,
  AS extends RpcArgsSchema | undefined = undefined,
  RS extends RpcReturnSchema | undefined = undefined,
  CONTEXT = undefined,
>
  = [AS, RS] extends [undefined, undefined]
    ? {
        /** Function name (unique identifier) */
        name: NAME
        /** Function type (static, action, event, or query) */
        type?: TYPE
        /** Whether the function results should be cached */
        cacheable?: boolean
        /** Valibot schema array for validating function arguments */
        args?: AS
        /** Valibot schema for validating function return value */
        returns?: RS
        /**
         * Expose this function to agents (e.g. via the MCP adapter).
         * When omitted, the function is not agent-exposed (default-deny).
         *
         * @experimental
         */
        agent?: RpcFunctionAgentOptions
        /** Setup function called with context to initialize handler and dump */
        setup?: (context: CONTEXT) => Thenable<RpcFunctionSetupResult<ARGS, RETURN>>
        /** Function implementation (required if setup doesn't provide one) */
        handler?: (...args: ARGS) => RETURN
        /** Dump definition (setup dump takes priority) */
        dump?: RpcDump<ARGS, RETURN, CONTEXT>
        /**
         * Sugar for "query in dev, single baked snapshot in build": when
         * `true` and no `dump` is provided, the build adapter runs the
         * handler once with no arguments and stores the result as both a
         * no-args record and the fallback so any call variant resolves
         * to the same snapshot. Only valid on `query` (or untyped)
         * functions — `static` already has equivalent default behavior.
         */
        snapshot?: boolean
        __resolved?: RpcFunctionSetupResult<ARGS, RETURN>
        __promise?: Thenable<RpcFunctionSetupResult<ARGS, RETURN>>
      }
    : {
        /** Function name (unique identifier) */
        name: NAME
        /** Function type (static, action, event, or query) */
        type?: TYPE
        /** Whether the function results should be cached */
        cacheable?: boolean
        /** Valibot schema array for validating function arguments */
        args: AS
        /** Valibot schema for validating function return value */
        returns: RS
        /**
         * Expose this function to agents (e.g. via the MCP adapter).
         * When omitted, the function is not agent-exposed (default-deny).
         *
         * @experimental
         */
        agent?: RpcFunctionAgentOptions
        /** Setup function called with context to initialize handler and dump */
        setup?: (context: CONTEXT) => Thenable<RpcFunctionSetupResult<InferArgsType<AS>, InferReturnType<RS>>>
        /** Function implementation (required if setup doesn't provide one) */
        handler?: (...args: InferArgsType<AS>) => InferReturnType<RS>
        /** Dump definition (setup dump takes priority) */
        dump?: RpcDump<InferArgsType<AS>, InferReturnType<RS>, CONTEXT>
        /**
         * Sugar for "query in dev, single baked snapshot in build": when
         * `true` and no `dump` is provided, the build adapter runs the
         * handler once with no arguments and stores the result as both a
         * no-args record and the fallback so any call variant resolves
         * to the same snapshot. Only valid on `query` (or untyped)
         * functions — `static` already has equivalent default behavior.
         */
        snapshot?: boolean
        __resolved?: RpcFunctionSetupResult<InferArgsType<AS>, InferReturnType<RS>>
        __promise?: Thenable<RpcFunctionSetupResult<InferArgsType<AS>, InferReturnType<RS>>>
      }

export type RpcFunctionDefinitionToFunction<T extends RpcFunctionDefinitionAny>
  = T extends { args: infer AS, returns: infer RS }
    ? AS extends RpcArgsSchema
      ? RS extends RpcReturnSchema
        ? (...args: InferArgsType<AS>) => InferReturnType<RS>
        : never
      : never
    : T extends RpcFunctionDefinition<string, any, infer ARGS, infer RETURN, any, any, any>
      ? (...args: ARGS) => RETURN
      : never

export type RpcFunctionDefinitionAny = RpcFunctionDefinition<string, any, any, any, any, any, any>
export type RpcFunctionDefinitionAnyWithContext<CONTEXT = undefined> = RpcFunctionDefinition<string, any, any, any, any, any, CONTEXT>

export type RpcDefinitionsToFunctions<T extends readonly RpcFunctionDefinitionAny[]> = EntriesToObject<{
  [K in keyof T]: [T[K]['name'], RpcFunctionDefinitionToFunction<T[K]>]
}>

export type RpcDefinitionsFilter<
  T extends readonly RpcFunctionDefinitionAny[],
  Type extends RpcFunctionType,
> = {
  [K in keyof T]: T[K] extends { type: Type } ? T[K] : never
}
