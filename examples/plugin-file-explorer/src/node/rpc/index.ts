import { createFileExplorerGetInfoRpc } from './functions/file-explorer-get-info'
import { createFileExplorerListFilesRpc } from './functions/file-explorer-list-files'
import { createFileExplorerReadFileRpc } from './functions/file-explorer-read-file'
import { createFileExplorerWriteFileRpc } from './functions/file-explorer-write-file'

export function createFileExplorerRpcFunctions(targetDir: string) {
  return [
    createFileExplorerGetInfoRpc(targetDir),
    createFileExplorerListFilesRpc(targetDir),
    createFileExplorerReadFileRpc(targetDir),
    createFileExplorerWriteFileRpc(targetDir),
  ] as const
}
