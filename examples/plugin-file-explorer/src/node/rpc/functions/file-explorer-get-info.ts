import type { FileExplorerInfo } from '../../types'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { resolve } from 'pathe'

export function createFileExplorerGetInfoRpc(targetDir: string) {
  return defineRpcFunction({
    name: 'kit-plugin-file-explorer:getInfo',
    type: 'static',
    setup: async (context) => {
      const rootDir = resolve(context.cwd, targetDir)
      const info: FileExplorerInfo = {
        rootDir,
      }
      return {
        handler: () => info,
      }
    },
  })
}
