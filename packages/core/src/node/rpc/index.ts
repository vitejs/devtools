import type { DevToolsDockEntry, DevToolsDocksUserSettings, DevToolsTerminalSessionStreamChunkEvent, RpcDefinitionsFilter, RpcDefinitionsToFunctions } from '@vitejs/devtools-kit'
import type { SharedStatePatch } from '@vitejs/devtools-kit/utils/shared-state'
import { anonymousAuth } from './anonymous/auth'
import { docksOnLaunch } from './internal/docks-on-launch'
import { logsAdd } from './internal/logs-add'
import { logsClear } from './internal/logs-clear'
import { logsList } from './internal/logs-list'
import { logsRemove } from './internal/logs-remove'
import { logsUpdate } from './internal/logs-update'
import { rpcServerList } from './internal/rpc-server-list'
import { sharedStateGet } from './internal/state/get'
import { sharedStatePatch } from './internal/state/patch'
import { sharedStateSet } from './internal/state/set'
import { sharedStateSubscribe } from './internal/state/subscribe'
import { terminalsList } from './internal/terminals-list'
import { terminalsRead } from './internal/terminals-read'
import { openInEditor } from './public/open-in-editor'
import { openInFinder } from './public/open-in-finder'

// @keep-sorted
export const builtinPublicRpcDeclarations = [
  openInEditor,
  openInFinder,
] as const

export const builtinAnonymousRpcDeclarations = [
  anonymousAuth,
] as const

// @keep-sorted
export const builtinInternalRpcDeclarations = [
  docksOnLaunch,
  logsAdd,
  logsClear,
  logsList,
  logsRemove,
  logsUpdate,
  rpcServerList,
  sharedStateGet,
  sharedStatePatch,
  sharedStateSet,
  sharedStateSubscribe,
  terminalsList,
  terminalsRead,
] as const

export const builtinRpcDeclarations = [
  ...builtinPublicRpcDeclarations,
  ...builtinAnonymousRpcDeclarations,
  ...builtinInternalRpcDeclarations,
] as const

export type BuiltinServerFunctions = RpcDefinitionsToFunctions<typeof builtinRpcDeclarations>

export type BuiltinServerFunctionsStatic = RpcDefinitionsToFunctions<
  RpcDefinitionsFilter<typeof builtinRpcDeclarations, 'static'>
>

export type BuiltinServerFunctionsDump = {
  [K in keyof BuiltinServerFunctionsStatic]: Awaited<ReturnType<BuiltinServerFunctionsStatic[K]>>
}

declare module '@vitejs/devtools-kit' {
  export interface DevToolsRpcServerFunctions extends BuiltinServerFunctions {}

  // @keep-sorted
  export interface DevToolsRpcClientFunctions {

    'devtoolskit:internal:logs:updated': () => Promise<void>
    'devtoolskit:internal:rpc:client-state:patch': (key: string, patches: SharedStatePatch[], syncId: string) => Promise<void>
    'devtoolskit:internal:rpc:client-state:updated': (key: string, fullState: any, syncId: string) => Promise<void>

    'devtoolskit:internal:terminals:stream-chunk': (data: DevToolsTerminalSessionStreamChunkEvent) => Promise<void>
    'devtoolskit:internal:terminals:updated': () => Promise<void>
  }

  // @keep-sorted
  export interface DevToolsRpcSharedStates {
    'devtoolskit:internal:docks': DevToolsDockEntry[]
    'devtoolskit:internal:user-settings': DevToolsDocksUserSettings
  }
}
