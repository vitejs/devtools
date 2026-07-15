import { execSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { cwd, exit } from 'node:process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'pathe'

export async function getOxlintVersion() {
  try {
    const version = execSync('npx oxlint --version', { encoding: 'utf-8' })
    return version.split(' ')[1]?.replaceAll('\n', '') ?? undefined
  } catch {
    console.error('Oxlint is not installed, please install it first')
    exit(1)
  }
}

export async function getOxlintConfig() {
  // Read the .oxlintrc.json file in the current directory
  const configPath = resolve(cwd(), '.oxlintrc.json')
  try {
    const config = await readFile(configPath, 'utf-8')

    return config
  } catch {
    return null
  }
}

function wrapOxlintCommand(rawArgs: string[]) {
  const args = rawArgs.slice(1)
  const commandArgs = ['npx', '--yes', 'oxlint', '-f', 'json', ...args]
  return commandArgs.join(' ')
}

export function execOxlintCommand(rawArgs: string[]) {
  try {
    const oxlintCommand = wrapOxlintCommand(rawArgs)
    const output = execSync(oxlintCommand, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] })
    return output
  } catch (error) {
    if (error instanceof Error && 'stdout' in error) {
      return error.stdout as string
    }
    throw error
  }
}

export const clientDir = resolve(dirname(fileURLToPath(import.meta.url)), './client/public')

// Group diagnostics by filename
export async function groupByFilename(oxlintOutput: string) {
  try {
    const data = JSON.parse(oxlintOutput)
    const diagnostics = data.diagnostics || []

    // Group by filename
    const grouped = diagnostics.reduce((acc: Record<string, any>, diagnostic: any) => {
      const filename = diagnostic.filename
      if (!acc[filename]) {
        acc[filename] = {
          filename,
          lines: {},
        }
      }

      // Group by line
      const line = diagnostic.labels?.[0]?.span?.line || 1
      if (!acc[filename].lines[line]) {
        acc[filename].lines[line] = []
      }
      acc[filename].lines[line].push(diagnostic)

      return acc
    }, {})

    // Convert to array format, turn the lines object into an array, and read each file's contents
    const result = await Promise.all(
      Object.values(grouped).map(async (file: any) => {
        let source = ''
        try {
          source = await readFile(file.filename, 'utf-8')
        } catch (error) {
          console.warn(`Can not read file ${file.filename}:`, error)
          source = ''
        }

        return {
          filename: file.filename,
          source,
          lines: Object.entries(file.lines)
            .map(([line, messages]: [string, any]) => ({
              line: Number.parseInt(line),
              messages,
            }))
            .sort((a, b) => a.line - b.line), // Sort by line number
        }
      }),
    )

    return {
      files: result,
      summary: {
        number_of_files: data.number_of_files,
        number_of_rules: data.number_of_rules,
        threads_count: data.threads_count,
        start_time: data.start_time,
        files_with_issues: result.length,
        error_count: diagnostics.filter((d: any) => d.severity === 'error').length,
        warning_count: diagnostics.filter((d: any) => d.severity === 'warning').length,
      },
    }
  } catch (error) {
    console.error('Failed to parse oxlint output:', error)
    return { files: [], summary: {} }
  }
}
