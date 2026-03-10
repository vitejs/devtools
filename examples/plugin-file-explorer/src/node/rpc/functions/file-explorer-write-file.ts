import { stat, writeFile } from 'node:fs/promises'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { resolve } from 'pathe'
import { resolveSafePath } from '../../utils'

export function createFileExplorerWriteFileRpc(targetDir: string) {
  return defineRpcFunction({
    name: 'kit-plugin-file-explorer:writeFile',
    type: 'action',
    setup: async (context) => {
      const rootDir = resolve(context.cwd, targetDir)

      return {
        handler: async (path: string, content: string): Promise<void> => {
          const resolved = resolveSafePath(rootDir, path)
          const fileStat = await stat(resolved.absolutePath)
          if (!fileStat.isFile())
            throw new Error(`File is not a regular file: ${JSON.stringify(path)}`)
          await writeFile(resolved.absolutePath, content, 'utf-8')
        },
      }
    },
  })
}
