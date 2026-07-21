import type { FileData, Message, Summary } from '../../types'
import { appendFile, readFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { cwd } from 'node:process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'pathe'

export async function getOxlintConfig(root = cwd()) {
  const configPath = resolve(root, 'oxlint.config.ts')
  try {
    const config = await readFile(configPath, 'utf-8')

    return config
  } catch {
    return null
  }
}

export async function ensureOxcGitignored(root: string) {
  const gitignorePath = resolve(root, '.gitignore')
  let content = ''
  try {
    content = await readFile(gitignorePath, 'utf-8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
    throw error
  }

  if (
    content.split('\n').some(line => {
      const entry = line.trim()
      return entry && !entry.startsWith('#') && entry.includes('.devtools-oxc')
    })
  )
    return

  await appendFile(
    gitignorePath,
    `${content && !content.endsWith('\n') ? '\n' : ''}.devtools-oxc\n`,
  )
}

export async function parseOxlintOutput(rawOutput: string, root: string) {
  const data = JSON.parse(rawOutput) as Record<string, unknown>
  const summaryFields = [
    'number_of_files',
    'number_of_rules',
    'threads_count',
    'start_time',
  ] as const
  if (
    !data ||
    !Array.isArray(data.diagnostics) ||
    summaryFields.some(field =>
      field === 'number_of_rules'
        ? data[field] !== null && typeof data[field] !== 'number'
        : typeof data[field] !== 'number',
    ) ||
    data.diagnostics.some(
      diagnostic =>
        !diagnostic ||
        typeof diagnostic !== 'object' ||
        typeof diagnostic.filename !== 'string' ||
        typeof diagnostic.severity !== 'string' ||
        !Array.isArray(diagnostic.labels),
    )
  )
    return null

  const diagnostics = data.diagnostics as Message[]
  const grouped = new Map<string, Map<number, Message[]>>()

  for (const diagnostic of diagnostics) {
    const lines = grouped.get(diagnostic.filename) ?? new Map<number, Message[]>()
    const line = diagnostic.labels?.[0]?.span?.line ?? 1
    lines.set(line, [...(lines.get(line) ?? []), diagnostic])
    grouped.set(diagnostic.filename, lines)
  }

  const files: FileData[] = await Promise.all(
    [...grouped].map(async ([filename, lines]) => ({
      filename,
      source: await readFile(resolve(root, filename), 'utf-8').catch(() => ''),
      lines: [...lines].sort(([a], [b]) => a - b).map(([line, messages]) => ({ line, messages })),
    })),
  )
  const summary: Summary = {
    number_of_files: data.number_of_files as number,
    number_of_rules: data.number_of_rules as number,
    threads_count: data.threads_count as number,
    start_time: data.start_time as number,
    files_with_issues: files.length,
    error_count: diagnostics.filter(diagnostic => diagnostic.severity === 'error').length,
    warning_count: diagnostics.filter(diagnostic => diagnostic.severity === 'warning').length,
  }

  return { files, summary }
}

export const clientDir = resolve(dirname(fileURLToPath(import.meta.url)), './client/public')
