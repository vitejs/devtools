import type { FileExplorerFileDetail, ResolvedFilePath } from '../../types'
import { readFile, stat } from 'node:fs/promises'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { resolve } from 'pathe'
import { resolveSafePath } from '../../utils'

export function createFileExplorerReadFileRpc(targetDir: string) {
  return defineRpcFunction({
    name: 'kit-plugin-file-explorer:readFile',
    type: 'query',
    setup: async (context) => {
      const rootDir = resolve(context.cwd, targetDir)

      return {
        handler: async (path: string): Promise<FileExplorerFileDetail | null> => {
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
        dump: {
          inputs: [] as const,
          fallback: null,
        },
      }
    },
  })
}
