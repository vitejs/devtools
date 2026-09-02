import type { DevToolsDockEntry, DevToolsDocksUserSettings, DevToolsServerCommandEntry, RpcDefinitionsFilter, RpcDefinitionsToFunctions } from '@vitejs/devtools-kit'
import { commandsExecute } from './internal/commands-execute'
import { commandsList } from './internal/commands-list'
import { docksOnLaunch } from './internal/docks-on-launch'
import { messagesAdd } from './internal/messages-add'
import { messagesClear } from './internal/messages-clear'
import { messagesList } from './internal/messages-list'
import { messagesRemove } from './internal/messages-remove'
import { messagesUpdate } from './internal/messages-update'
import { rpcServerList } from './internal/rpc-server-list'
import { openInEditor } from './public/open-in-editor'
import { openInFinder } from './public/open-in-finder'

// @keep-sorted
export const builtinPublicRpcDeclarations = [
  openInEditor,
  openInFinder,
] as const

// The interactive OTP auth handshake (`anonymous:devframe:auth*`) and
// `devframe:auth:revoke` are registered at runtime from devframe's
// `createInteractiveAuth` recipe — see `node/auth-handler.ts`.

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
] as const

export const builtinRpcDeclarations = [
  ...builtinPublicRpcDeclarations,
  ...builtinInternalRpcDeclarations,
] as const

export type BuiltinServerFunctions = RpcDefinitionsToFunctions<typeof builtinRpcDeclarations>

export type BuiltinServerFunctionsStatic = RpcDefinitionsToFunctions<
  RpcDefinitionsFilter<typeof builtinRpcDeclarations, 'static'>
>

export type BuiltinServerFunctionsDump = {
  [K in keyof BuiltinServerFunctionsStatic]: Awaited<ReturnType<BuiltinServerFunctionsStatic[K]>>
}

// devframe ≥0.7.4 declares its RPC name maps inside a bundled chunk that the
// public entrypoints re-export, so augmentation must target `devframe/types`
// directly — a renamed re-export (the kit's `DevTools*` alias) no longer
// merges. `@devframes/hub` augments the same module. `hub:docks:activate` is
// now declared by the hub itself, so we no longer declare it here.
declare module 'devframe/types' {
  interface DevframeRpcServerFunctions extends BuiltinServerFunctions {}

  // @keep-sorted
  // `devframe:auth:revoked` and `devframe:rpc:client-state:*` are declared
  // upstream by devframe; `devframe:messages:updated` / `devframe:terminals:updated`
  // by `@devframes/hub`. We only declare what is Vite-DevTools-specific here.
  interface DevframeRpcClientFunctions {}

  // @keep-sorted
  interface DevframeRpcSharedStates {
    'devframe:commands': DevToolsServerCommandEntry[]
    'devframe:docks': DevToolsDockEntry[]
    'devframe:user-settings': DevToolsDocksUserSettings
  }
}
