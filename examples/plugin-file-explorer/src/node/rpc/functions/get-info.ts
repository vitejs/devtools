import type { FileExplorerInfo } from '../../types'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { resolve } from 'pathe'
import { getFileExplorerOptions } from '../context'

export const fileExplorerGetInfo = defineRpcFunction<
  'plugin-file-explorer:get-info',
  'static',
  [],
  Promise<FileExplorerInfo>
>({
  name: 'plugin-file-explorer:get-info',
  type: 'static',
  setup: async (context) => {
    const { targetDir } = getFileExplorerOptions(context)
    const rootDir = resolve(context.cwd, targetDir)
    const info: FileExplorerInfo = {
      rootDir,
    }
    return {
      handler: async () => info,
    }
  },
})
