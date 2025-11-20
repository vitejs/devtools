import type { DevToolsTerminalSessionStreamChunkEvent, RpcDefinitionsFilter, RpcDefinitionsToFunctions } from '@vitejs/devtools-kit'
import { docksList } from './internal/docks-list'
import { docksOnLaunch } from './internal/docks-on-launch'
import { rpcServerList } from './internal/rpc-server-list'
import { terminalsList } from './internal/terminals-list'
import { openInEditor } from './public/open-in-editor'
import { openInFinder } from './public/open-in-finder'

export const builtinPublicRpcDecalrations = [
  openInEditor,
  openInFinder,
] as const

export const builtinInternalRpcDecalrations = [
  rpcServerList,
  docksList,
  terminalsList,
  docksOnLaunch,
] as const

export const builtinRpcDecalrations = [
  ...builtinPublicRpcDecalrations,
  ...builtinInternalRpcDecalrations,
] as const

export type BuiltinServerFunctions = RpcDefinitionsToFunctions<typeof builtinRpcDecalrations>

export type BuiltinServerFunctionsStatic = RpcDefinitionsToFunctions<
  RpcDefinitionsFilter<typeof builtinRpcDecalrations, 'static'>
>

export type BuiltinServerFunctionsDump = {
  [K in keyof BuiltinServerFunctionsStatic]: Awaited<ReturnType<BuiltinServerFunctionsStatic[K]>>
}

declare module '@vitejs/devtools-kit' {
  export interface DevToolsRpcServerFunctions extends BuiltinServerFunctions {}

  export interface DevToolsRpcClientFunctions {
    'vite:internal:docks:updated': () => Promise<void>
    'vite:internal:terminals:updated': () => Promise<void>
    'vite:internal:terminals:stream-chunk': (data: DevToolsTerminalSessionStreamChunkEvent) => Promise<void>
  }
}
