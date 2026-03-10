import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { readFile } from 'node:fs/promises'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { resolve } from 'pathe'
import { glob } from 'tinyglobby'

interface ModuleDetails {
  id: string
  bytes: number
  lines: number
  importsCount: number
  exportsCount: number
  checksum: string
  preview: string
  source: string
}

interface ModuleSnapshot {
  moduleIds: string[]
  totalBytes: number
  detailsById: Record<string, ModuleDetails>
}

interface KitPluginBasicOptions {
  uiBase?: string
}

export const DEFAULT_UI_BASE = '/.plugin-basic/'

export function resolveUiBase(base = process.env.KIT_PLUGIN_BASIC_UI_BASE || DEFAULT_UI_BASE): string {
  let normalized = base.trim()
  if (!normalized.startsWith('/'))
    normalized = `/${normalized}`
  if (!normalized.endsWith('/'))
    normalized = `${normalized}/`
  return normalized
}

function countMatches(source: string, pattern: RegExp): number {
  return source.match(pattern)?.length ?? 0
}

async function collectModuleSnapshot(root: string): Promise<ModuleSnapshot> {
  const playgroundRoot = resolve(root, 'playground')
  const files = await glob([
    'src/**/*.{ts,tsx,js,jsx,css,html,json}',
  ], {
    cwd: playgroundRoot,
    absolute: true,
  })

  const detailsById: Record<string, ModuleDetails> = {}
  let totalBytes = 0

  for (const filepath of files.sort()) {
    const source = await readFile(filepath, 'utf-8')
    const id = `/${filepath.slice(playgroundRoot.length + 1).replace(/\\/g, '/')}`
    const bytes = Buffer.byteLength(source, 'utf-8')
    const lines = source.split(/\r?\n/g).length
    const importsCount = countMatches(source, /\bimport\b/g)
    const exportsCount = countMatches(source, /\bexport\b/g)
    const checksum = createHash('sha1')
      .update(source)
      .digest('hex')
      .slice(0, 12)

    totalBytes += bytes
    detailsById[id] = {
      id,
      bytes,
      lines,
      importsCount,
      exportsCount,
      checksum,
      preview: source.slice(0, 14_000),
      source,
    }
  }

  return {
    moduleIds: Object.keys(detailsById).sort(),
    totalBytes,
    detailsById,
  }
}

const modulesSummary = defineRpcFunction({
  name: 'kit-plugin-basic:modules:summary',
  type: 'static',
  setup: async (context) => {
    const snapshot = await collectModuleSnapshot(context.cwd)
    return {
      handler: () => ({
        generatedAt: new Date().toISOString(),
        totalModules: snapshot.moduleIds.length,
        totalBytes: snapshot.totalBytes,
        moduleIds: snapshot.moduleIds,
      }),
    }
  },
})

const moduleDetail = defineRpcFunction({
  name: 'kit-plugin-basic:modules:detail',
  type: 'query',
  setup: async (context) => {
    const snapshot = await collectModuleSnapshot(context.cwd)
    return {
      handler: (id: string) => snapshot.detailsById[id] ?? null,
      dump: {
        inputs: snapshot.moduleIds.map(id => [id]),
        fallback: null,
      },
    }
  },
})

export function createKitPluginBasicDevToolsPlugin(options: KitPluginBasicOptions = {}) {
  const uiBase = resolveUiBase(options.uiBase)

  return {
    name: 'kit-plugin-basic-devtools',
    devtools: {
      setup(context: any) {
        const distFromBundle = fileURLToPath(new URL('./ui', import.meta.url))
        const distFromSource = fileURLToPath(new URL('../../dist/ui', import.meta.url))
        const iframeDist = fs.existsSync(distFromBundle) ? distFromBundle : distFromSource

        context.rpc.register(modulesSummary)
        context.rpc.register(moduleDetail)

        context.views.hostStatic(uiBase, resolve(iframeDist))
        context.docks.register({
          id: 'kit-plugin-basic:module-explorer',
          title: 'Module Explorer',
          icon: 'ph:tree-structure-duotone',
          type: 'iframe',
          url: uiBase,
        })
      },
    },
  }
}

export default createKitPluginBasicDevToolsPlugin
