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
  // 读取当前目录下的 .oxlintrc.json 文件
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

// 按 filename 分组的函数
export async function groupByFilename(oxlintOutput: string) {
  try {
    const data = JSON.parse(oxlintOutput)
    const diagnostics = data.diagnostics || []

    // 按 filename 分组
    const grouped = diagnostics.reduce((acc: Record<string, any>, diagnostic: any) => {
      const filename = diagnostic.filename
      if (!acc[filename]) {
        acc[filename] = {
          filename,
          lines: {},
        }
      }

      // 按 line 分组
      const line = diagnostic.labels?.[0]?.span?.line || 1
      if (!acc[filename].lines[line]) {
        acc[filename].lines[line] = []
      }
      acc[filename].lines[line].push(diagnostic)

      return acc
    }, {})

    // 转换为数组格式，并将 lines 对象转换为数组，同时读取文件内容
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
            .sort((a, b) => a.line - b.line), // 按行号排序
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
