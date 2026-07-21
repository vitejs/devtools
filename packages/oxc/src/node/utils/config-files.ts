import type { OxcConfigFile } from '../../types'
import { execFile as execFileCallback } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'pathe'
import { promisify } from 'node:util'

const execFile = promisify(execFileCallback)

const CONFIG_FILES = {
  '.oxlintrc.json': { tool: 'oxlint', format: 'json' },
  '.oxlintrc.jsonc': { tool: 'oxlint', format: 'jsonc' },
  'oxlint.config.js': { tool: 'oxlint', format: 'js' },
  'oxlint.config.mjs': { tool: 'oxlint', format: 'mjs' },
  'oxlint.config.cjs': { tool: 'oxlint', format: 'cjs' },
  'oxlint.config.ts': { tool: 'oxlint', format: 'ts' },
  'oxlint.config.mts': { tool: 'oxlint', format: 'mts' },
  'oxlint.config.cts': { tool: 'oxlint', format: 'cts' },
  '.oxfmtrc.json': { tool: 'oxfmt', format: 'json' },
  '.oxfmtrc.jsonc': { tool: 'oxfmt', format: 'jsonc' },
  'oxfmt.config.ts': { tool: 'oxfmt', format: 'ts' },
  'oxfmt.config.mts': { tool: 'oxfmt', format: 'mts' },
} as const

const VITE_PLUS_CONFIG_FIELDS = {
  lint: 'oxlint',
  fmt: 'oxfmt',
} as const

async function getIgnoredDirectories(cwd: string) {
  try {
    const { stdout } = await execFile('git', [
      '-C',
      cwd,
      'ls-files',
      '--others',
      '--ignored',
      '--exclude-standard',
      '--directory',
      '-z',
    ])
    return new Set(stdout.split('\0').filter(path => path.endsWith('/')))
  } catch {
    return new Set<string>()
  }
}

export async function getOxcConfigFiles(cwd: string) {
  const files: OxcConfigFile[] = []
  const ignoredDirectories = await getIgnoredDirectories(cwd)

  async function visit(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true })
    await Promise.all(
      entries.map(async entry => {
        const path = join(dir, entry.name)
        if (entry.isDirectory()) {
          const relativePath = relative(cwd, path)
          if (
            entry.name !== '.git' &&
            entry.name !== 'node_modules' &&
            !ignoredDirectories.has(`${relativePath}/`)
          ) {
            await visit(path)
          }
          return
        }

        const config = CONFIG_FILES[entry.name as keyof typeof CONFIG_FILES]
        if (entry.isFile() && config) {
          files.push({
            ...config,
            path: relative(cwd, path),
            content: await readFile(path, 'utf-8'),
            source: 'oxc',
          })
        }
        if (entry.isFile() && /^vite\.config\.(ts|js)$/.test(entry.name)) {
          const content = await readFile(path, 'utf-8')
          const format = entry.name.endsWith('.ts') ? 'ts' : 'js'
          for (const [field, tool] of Object.entries(VITE_PLUS_CONFIG_FIELDS)) {
            if (new RegExp(`(?:^|[,{])\\s*${field}\\s*:`, 'm').test(content)) {
              files.push({
                tool,
                format,
                path: relative(cwd, path),
                content,
                source: 'vite-plus',
              })
            }
          }
        }
      }),
    )
  }

  await visit(cwd)
  return files.sort((a, b) => a.path.localeCompare(b.path))
}
