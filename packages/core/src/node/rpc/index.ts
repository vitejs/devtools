import type { DevToolsTerminalSessionStreamChunkEvent, RpcDefinitionsFilter, RpcDefinitionsToFunctions } from '@vitejs/devtools-kit'
import { anonymousAuth } from './anonymous/auth'
import { docksList } from './internal/docks-list'
import { docksOnLaunch } from './internal/docks-on-launch'
import { rpcServerList } from './internal/rpc-server-list'
import { terminalsList } from './internal/terminals-list'
import { terminalsRead } from './internal/terminals-read'
import { openInEditor } from './public/open-in-editor'
import { openInFinder } from './public/open-in-finder'

// @keep-sorted
export const builtinPublicRpcDecalrations = [
  openInEditor,
  openInFinder,
] as const

export const builtinAnonymousRpcDecalrations = [
  anonymousAuth,
] as const

// @keep-sorted
export const builtinInternalRpcDecalrations = [
  docksList,
  docksOnLaunch,
  rpcServerList,
  terminalsList,
  terminalsRead,
] as const

export const builtinRpcDecalrations = [
  ...builtinPublicRpcDecalrations,
  ...builtinAnonymousRpcDecalrations,
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

  // @keep-sorted
  export interface DevToolsRpcClientFunctions {
    'vite:internal:docks:updated': () => Promise<void>
    'vite:internal:terminals:stream-chunk': (data: DevToolsTerminalSessionStreamChunkEvent) => Promise<void>
    'vite:internal:terminals:updated': () => Promise<void>
  }
}
