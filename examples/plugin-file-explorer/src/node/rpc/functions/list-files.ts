import type { FileExplorerFileEntry } from '../../types'
import fs from 'node:fs'
import { stat } from 'node:fs/promises'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { extname, relative, resolve } from 'pathe'
import { glob } from 'tinyglobby'
import { toPosixPath } from '../../utils'
import { getFileExplorerOptions } from '../context'

export const fileExplorerListFiles = defineRpcFunction<
  'plugin-file-explorer:listFiles',
  'query',
  [],
  Promise<FileExplorerFileEntry[]>
>({
  name: 'plugin-file-explorer:listFiles',
  type: 'query',
  setup: async (context) => {
    return {
      handler: async () => {
        const { targetDir } = getFileExplorerOptions(context)
        const rootDir = resolve(context.cwd, targetDir)
        const absoluteFiles = fs.existsSync(rootDir)
          ? await glob(['**/*'], {
              cwd: rootDir,
              absolute: true,
              onlyFiles: true,
              dot: false,
            })
          : []
        const files = await Promise.all(
          absoluteFiles
            .sort((a, b) => a.localeCompare(b))
            .map(async (absolutePath): Promise<FileExplorerFileEntry> => {
              const filePath = toPosixPath(relative(rootDir, absolutePath))
              const fileStat = await stat(absolutePath)
              return {
                path: filePath,
                size: fileStat.size,
                ext: extname(filePath),
              }
            }),
        )
        return files
      },
      dump: {
        inputs: [[]] as const,
      },
    }
  },
})
