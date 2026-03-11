import type { RpcDefinitionsFilter, RpcDefinitionsToFunctions } from '@vitejs/devtools-kit'
import { getClientScripts } from './functions/get-client-scripts'
import { getDevtoolsPlugins } from './functions/get-devtools-plugins'
import { getDocks } from './functions/get-docks'
import { getRpcFunctions } from './functions/get-rpc-functions'
import '@vitejs/devtools-kit'

export const rpcFunctions = [
  getDocks,
  getRpcFunctions,
  getClientScripts,
  getDevtoolsPlugins,
] as const

export type ServerFunctions = RpcDefinitionsToFunctions<typeof rpcFunctions>

export type ServerFunctionsStatic = RpcDefinitionsToFunctions<
  RpcDefinitionsFilter<typeof rpcFunctions, 'static'>
>

export type ServerFunctionsDump = {
  [K in keyof ServerFunctionsStatic]: Awaited<ReturnType<ServerFunctionsStatic[K]>>
}

declare module '@vitejs/devtools-kit' {
  export interface DevToolsRpcServerFunctions extends ServerFunctions {}
}
