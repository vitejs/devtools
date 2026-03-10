import { stat, writeFile } from 'node:fs/promises'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { resolve } from 'pathe'
import { resolveSafePath } from '../../utils'
import { getFileExplorerOptions } from '../context'

export const fileExplorerWriteFile = defineRpcFunction<
  'plugin-file-explorer:write-file',
  'action',
  [path: string, content: string],
  Promise<void>
>({
  name: 'plugin-file-explorer:write-file',
  type: 'action',
  setup: async (context) => {
    return {
      handler: async (path: string, content: string): Promise<void> => {
        const { targetDir } = getFileExplorerOptions(context)
        const rootDir = resolve(context.cwd, targetDir)
        const resolved = resolveSafePath(rootDir, path)
        const fileStat = await stat(resolved.absolutePath)
        if (!fileStat.isFile())
          throw new Error(`File is not a regular file: ${JSON.stringify(path)}`)
        await writeFile(resolved.absolutePath, content, 'utf-8')
      },
    }
  },
})
