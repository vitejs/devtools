import type { FileExplorerInfo } from '../../types'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { resolve } from 'pathe'
import { getFileExplorerOptions } from '../context'

export const fileExplorerGetInfo = defineRpcFunction<
  'kit-plugin-file-explorer:getInfo',
  'static',
  [],
  Promise<FileExplorerInfo>
>({
  name: 'kit-plugin-file-explorer:getInfo',
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
