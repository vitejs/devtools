import type { DevToolsDockEntry, DevToolsDocksUserSettings, DevToolsServerCommandEntry, RpcDefinitionsFilter, RpcDefinitionsToFunctions } from '@vitejs/devtools-kit'
import type { SharedStatePatch } from 'devframe/utils/shared-state'
import { anonymousAuth } from './anonymous/auth'
import { commandsExecute } from './internal/commands-execute'
import { commandsList } from './internal/commands-list'
import { docksOnLaunch } from './internal/docks-on-launch'
import { messagesAdd } from './internal/messages-add'
import { messagesClear } from './internal/messages-clear'
import { messagesList } from './internal/messages-list'
import { messagesRemove } from './internal/messages-remove'
import { messagesUpdate } from './internal/messages-update'
import { rpcServerList } from './internal/rpc-server-list'
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
  commandsExecute,
  commandsList,
  docksOnLaunch,
  messagesAdd,
  messagesClear,
  messagesList,
  messagesRemove,
  messagesUpdate,
  rpcServerList,
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
    'devtoolskit:internal:auth:revoked': () => Promise<void>
    'devtoolskit:internal:messages:updated': () => Promise<void>
    'devtoolskit:internal:rpc:client-state:patch': (key: string, patches: SharedStatePatch[], syncId: string) => Promise<void>
    'devtoolskit:internal:rpc:client-state:updated': (key: string, fullState: any, syncId: string) => Promise<void>

    'devtoolskit:internal:terminals:updated': () => Promise<void>
  }

  // @keep-sorted
  export interface DevToolsRpcSharedStates {
    'devtoolskit:internal:commands': DevToolsServerCommandEntry[]
    'devtoolskit:internal:docks': DevToolsDockEntry[]
    'devtoolskit:internal:user-settings': DevToolsDocksUserSettings
  }
}
