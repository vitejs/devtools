import type { EntriesToObject, Thenable } from './utils'

/**
 * To be extended
 */
export interface ViteDevtoolsRpcFunctions {}

/**
 * Type of the RPC function,
 * - static: A function that returns a static data (can be cached and dumped)
 * - action: A function that performs an action (no data returned)
 * - query: A function that queries a resource
 */
export type RpcFunctionType = 'static' | 'action' | 'query'

export interface RpcFunctionsHost {
  readonly functions: ViteDevtoolsRpcFunctions
  readonly definitions: Map<string, RpcFunctionDefinition<string, any, any, any>>
  register: (fn: RpcFunctionDefinition<string, any, any, any>) => void
}

export interface RpcFunctionSetupResult<
  ARGS extends any[],
  RETURN = void,
> {
  handler: (...args: ARGS) => RETURN
}

export interface RpcFunctionDefinition<
  NAME extends string,
  TYPE extends RpcFunctionType,
  ARGS extends any[] = [],
  RETURN = void,
> {
  name: NAME
  type: TYPE
  setup: (context: RpcContext) => Thenable<RpcFunctionSetupResult<ARGS, RETURN>>
  handler?: (...args: ARGS) => RETURN
  __resolved?: RpcFunctionSetupResult<ARGS, RETURN>
}

export interface RpcContext {
  cwd: string
  mode: 'dev' | 'build'
  functions: RpcFunctionsHost
  meta?: any
}

export type RpcDefinitionsToFunctions<T extends readonly RpcFunctionDefinition<any, any, any>[]> = EntriesToObject<{
  [K in keyof T]: [T[K]['name'], Awaited<ReturnType<T[K]['setup']>>['handler']]
}>

export type RpcDefinitionsFilter<
  T extends readonly RpcFunctionDefinition<any, any, any>[],
  Type extends RpcFunctionType,
> = {
  [K in keyof T]: T[K] extends { type: Type } ? T[K] : never
}
