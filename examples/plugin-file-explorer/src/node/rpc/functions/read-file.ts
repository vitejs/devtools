import type { FileExplorerFileDetail, FileExplorerFileEntry, ResolvedFilePath } from '../../types'
import { readFile, stat } from 'node:fs/promises'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { resolve } from 'pathe'
import { resolveSafePath } from '../../utils'
import { getFileExplorerOptions } from '../context'

export const fileExplorerReadFile = defineRpcFunction<
  'plugin-file-explorer:read-file',
  'query',
  [path: string],
  Promise<FileExplorerFileDetail | null>
>({
  name: 'plugin-file-explorer:read-file',
  type: 'query',
  setup: async (context) => {
    return {
      handler: async (path: string): Promise<FileExplorerFileDetail | null> => {
        const { targetDir } = getFileExplorerOptions(context)
        const rootDir = resolve(context.cwd, targetDir)
        let resolved: ResolvedFilePath

        try {
          resolved = resolveSafePath(rootDir, path)
        }
        catch {
          return null
        }

        try {
          const content = await readFile(resolved.absolutePath, 'utf-8')
          const fileStat = await stat(resolved.absolutePath)
          if (!fileStat.isFile())
            return null
          return {
            path: resolved.relativePath,
            content,
            size: fileStat.size,
          }
        }
        catch {
          return null
        }
      },
    }
  },
  dump: async (context) => {
    const files = await context.rpc.invokeLocal('plugin-file-explorer:list-files') as FileExplorerFileEntry[]
    return {
      inputs: files.map(file => [file.path] as [string]),
    }
  },
})
