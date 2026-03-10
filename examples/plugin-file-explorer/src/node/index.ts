import fs from 'node:fs'
import { readFile, stat, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { extname, relative, resolve } from 'pathe'
import { glob } from 'tinyglobby'

interface FileExplorerInfo {
  rootDir: string
  generatedAt: string
  fileCount: number
}

interface FileExplorerFileEntry {
  path: string
  size: number
  ext: string
}

interface FileExplorerFileDetail {
  path: string
  content: string
  size: number
}

interface FileExplorerFileRecord extends FileExplorerFileEntry {
  absolutePath: string
}

interface FileExplorerSnapshot {
  rootDir: string
  generatedAt: string
  files: FileExplorerFileRecord[]
}

interface KitPluginFileExplorerOptions {
  uiBase?: string
  targetDir?: string
}

export const DEFAULT_UI_BASE = '/.plugin-file-explorer/'
export const DEFAULT_TARGET_DIR = 'src'

export function resolveUiBase(base = process.env.KIT_PLUGIN_FILE_EXPLORER_UI_BASE || DEFAULT_UI_BASE): string {
  let normalized = base.trim()
  if (!normalized.startsWith('/'))
    normalized = `/${normalized}`
  if (!normalized.endsWith('/'))
    normalized = `${normalized}/`
  return normalized
}

function resolveTargetDir(targetDir = process.env.KIT_PLUGIN_FILE_EXPLORER_TARGET_DIR || DEFAULT_TARGET_DIR): string {
  const normalized = targetDir
    .trim()
    .replace(/^[/\\]+/, '')
    .replace(/[/\\]+$/, '')
  return normalized || DEFAULT_TARGET_DIR
}

function toPosixPath(path: string): string {
  return path.replace(/\\/g, '/')
}

function resolveSafePath(rootDir: string, path: string): { absolutePath: string, relativePath: string } {
  const normalized = toPosixPath(path.trim()).replace(/^\/+/, '')

  if (!normalized || normalized.includes('\0'))
    throw new Error(`Invalid file path: ${JSON.stringify(path)}`)

  if (normalized.split('/').includes('..'))
    throw new Error(`Path traversal is not allowed: ${JSON.stringify(path)}`)

  const absolutePath = resolve(rootDir, normalized)
  const relativePath = toPosixPath(relative(rootDir, absolutePath))

  if (!relativePath || relativePath.startsWith('../') || relativePath === '..')
    throw new Error(`Path is outside of root directory: ${JSON.stringify(path)}`)

  return {
    absolutePath,
    relativePath,
  }
}

async function collectFileSnapshot(cwd: string, targetDir: string): Promise<FileExplorerSnapshot> {
  const rootDir = resolve(cwd, targetDir)
  const generatedAt = new Date().toISOString()

  if (!fs.existsSync(rootDir)) {
    return {
      rootDir,
      generatedAt,
      files: [],
    }
  }

  const absoluteFiles = await glob([
    '**/*',
  ], {
    cwd: rootDir,
    absolute: true,
    onlyFiles: true,
    dot: false,
  })

  const files = await Promise.all(absoluteFiles
    .sort((a, b) => a.localeCompare(b))
    .map(async (absolutePath): Promise<FileExplorerFileRecord> => {
      const filepath = toPosixPath(relative(rootDir, absolutePath))
      const fileStat = await stat(absolutePath)
      return {
        path: filepath,
        size: fileStat.size,
        ext: extname(filepath),
        absolutePath,
      }
    }))

  return {
    rootDir,
    generatedAt,
    files,
  }
}

function createGetInfoRpc(targetDir: string) {
  return defineRpcFunction({
    name: 'kit-plugin-file-explorer:getInfo',
    type: 'static',
    setup: async (context) => {
      const snapshot = await collectFileSnapshot(context.cwd, targetDir)
      const info: FileExplorerInfo = {
        rootDir: snapshot.rootDir,
        generatedAt: snapshot.generatedAt,
        fileCount: snapshot.files.length,
      }
      return {
        handler: () => info,
      }
    },
  })
}

function createListFilesRpc(targetDir: string) {
  return defineRpcFunction({
    name: 'kit-plugin-file-explorer:listFiles',
    type: 'query',
    setup: async (context) => {
      const snapshot = await collectFileSnapshot(context.cwd, targetDir)
      const files: FileExplorerFileEntry[] = snapshot.files.map(file => ({
        path: file.path,
        size: file.size,
        ext: file.ext,
      }))

      return {
        handler: () => files,
        dump: {
          inputs: [[]],
        },
      }
    },
  })
}

function createReadFileRpc(targetDir: string) {
  return defineRpcFunction({
    name: 'kit-plugin-file-explorer:readFile',
    type: 'query',
    setup: async (context) => {
      const snapshot = await collectFileSnapshot(context.cwd, targetDir)
      const indexed = new Map(snapshot.files.map(file => [file.path, file]))

      return {
        handler: async (path: string): Promise<FileExplorerFileDetail | null> => {
          let resolved: { absolutePath: string, relativePath: string }

          try {
            resolved = resolveSafePath(snapshot.rootDir, path)
          }
          catch {
            return null
          }

          const record = indexed.get(resolved.relativePath)
          if (!record)
            return null

          try {
            const content = await readFile(record.absolutePath, 'utf-8')
            const fileStat = await stat(record.absolutePath)
            return {
              path: record.path,
              content,
              size: fileStat.size,
            }
          }
          catch {
            return null
          }
        },
        dump: {
          inputs: snapshot.files.map(file => [file.path]),
          fallback: null,
        },
      }
    },
  })
}

function createWriteFileRpc(targetDir: string) {
  return defineRpcFunction({
    name: 'kit-plugin-file-explorer:writeFile',
    type: 'action',
    setup: async (context) => {
      const snapshot = await collectFileSnapshot(context.cwd, targetDir)
      const knownFiles = new Set(snapshot.files.map(file => file.path))

      return {
        handler: async (path: string, content: string): Promise<void> => {
          const resolved = resolveSafePath(snapshot.rootDir, path)
          if (!knownFiles.has(resolved.relativePath)) {
            throw new Error(`File is not indexed: ${JSON.stringify(path)}`)
          }
          await writeFile(resolved.absolutePath, content, 'utf-8')
        },
      }
    },
  })
}

export function createKitPluginFileExplorerDevToolsPlugin(options: KitPluginFileExplorerOptions = {}) {
  const uiBase = resolveUiBase(options.uiBase)
  const targetDir = resolveTargetDir(options.targetDir)

  return {
    name: 'kit-plugin-file-explorer-devtools',
    devtools: {
      setup(context: any) {
        const distFromBundle = fileURLToPath(new URL('./ui', import.meta.url))
        const distFromSource = fileURLToPath(new URL('../../dist/ui', import.meta.url))
        const iframeDist = fs.existsSync(distFromBundle) ? distFromBundle : distFromSource

        context.rpc.register(createGetInfoRpc(targetDir))
        context.rpc.register(createListFilesRpc(targetDir))
        context.rpc.register(createReadFileRpc(targetDir))
        context.rpc.register(createWriteFileRpc(targetDir))

        context.views.hostStatic(uiBase, resolve(iframeDist))
        context.docks.register({
          id: 'kit-plugin-file-explorer:file-explorer',
          title: 'File Explorer',
          icon: 'ph:folder-open-duotone',
          type: 'iframe',
          url: uiBase,
        })
      },
    },
  }
}

export default createKitPluginFileExplorerDevToolsPlugin
