import type { RpcDefinitionsToFunctions } from '@vitejs/devtools-kit'
import { fileExplorerGetInfo } from './functions/get-info'
import { fileExplorerListFiles } from './functions/list-files'
import { fileExplorerReadFile } from './functions/read-file'
import { fileExplorerWriteFile } from './functions/write-file'
import '@vitejs/devtools-kit'

export const rpcFunctions = [
  fileExplorerGetInfo,
  fileExplorerListFiles,
  fileExplorerReadFile,
  fileExplorerWriteFile,
] as const

export type ServerFunctions = RpcDefinitionsToFunctions<typeof rpcFunctions>

declare module '@vitejs/devtools-kit' {
  export interface DevToolsRpcServerFunctions extends ServerFunctions {}
}
