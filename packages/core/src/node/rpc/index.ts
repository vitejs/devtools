import type { RpcDefinitionsFilter, RpcDefinitionsToFunctions } from '@vitejs/devtools-kit'
import { listDockEntries } from './list-dock-entries'
import { listRpcFunctions } from './list-rpc-functions'
import { onDockLaunch } from './on-dock-launch'
import { openInEditor } from './open-in-editor'
import { openInFinder } from './open-in-finder'

export const builtinRpcFunctions = [
  listRpcFunctions,
  listDockEntries,
  openInEditor,
  openInFinder,
  onDockLaunch,
] as const

export type ServerFunctions = RpcDefinitionsToFunctions<typeof builtinRpcFunctions>

export type ServerFunctionsStatic = RpcDefinitionsToFunctions<
  RpcDefinitionsFilter<typeof builtinRpcFunctions, 'static'>
>

export type ServerFunctionsDump = {
  [K in keyof ServerFunctionsStatic]: Awaited<ReturnType<ServerFunctionsStatic[K]>>
}

declare module '@vitejs/devtools-kit' {
  export interface DevToolsRpcServerFunctions extends ServerFunctions {}

  export interface DevToolsRpcClientFunctions {
    'vite:core:list-dock-entries:updated': () => Promise<void>
  }
}
