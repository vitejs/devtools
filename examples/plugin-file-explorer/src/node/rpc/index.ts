import type { RpcDefinitionsToFunctions } from '@vitejs/devtools-kit'
import { fileExplorerGetInfo } from './functions/file-explorer-get-info'
import { fileExplorerListFiles } from './functions/file-explorer-list-files'
import { fileExplorerReadFile } from './functions/file-explorer-read-file'
import { fileExplorerWriteFile } from './functions/file-explorer-write-file'
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
