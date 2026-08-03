import type { DevToolsTerminalHost } from '@vitejs/devtools-kit'
import type { DevframeNodeContext } from 'devframe/types'
import { existsSync } from 'node:fs'
import { addDependencyCommand, detectPackageManager, dlxCommand } from 'nypm'
import { Diagnostic } from 'nostics'
import { join } from 'pathe'
import { x } from 'tinyexec'
import { diagnostics } from '../../diagnostics'
import { CONFIG_FILES } from '../../utils/config-files'
import { defineOxcRpc } from '../_define'

const eslintConfigFiles = ['eslint.config.js', 'eslint.config.mjs']

type ContextWithTerminals = DevframeNodeContext & { terminals?: DevToolsTerminalHost }
type MigrationSession = Awaited<ReturnType<DevToolsTerminalHost['startChildProcess']>>

let current: MigrationSession | undefined
let currentSessionId: string | undefined
let runCount = 0

export function needsOxlintMigration(root: string): boolean {
  return (
    eslintConfigFiles.some(file => existsSync(join(root, file))) &&
    !Object.keys(CONFIG_FILES).some(file => existsSync(join(root, file)))
  )
}

export const oxlintMigrate = defineOxcRpc({
  name: 'devtools-oxc:migrate-eslint',
  type: 'action',
  setup: context => ({
    handler: () => startMigration(context as ContextWithTerminals),
  }),
})

async function startMigration(context: ContextWithTerminals): Promise<{ sessionId?: string }> {
  const root = context.cwd
  if (!needsOxlintMigration(root))
    throw diagnostics.OXDT0005({ reason: 'No eligible ESLint config was found.' })

  try {
    const packageManager = (await detectPackageManager(root))?.name ?? 'npm'
    const install = addDependencyCommand(packageManager, 'oxlint@latest', { dev: true })
    const run = dlxCommand(packageManager, '@oxlint/migrate', { short: true })
    return startSetup(context, [install, run], 'Migrate ESLint to Oxlint')
  } catch (error) {
    if (error instanceof Diagnostic) throw error
    throw diagnostics.OXDT0005({
      reason: error instanceof Error ? error.message : String(error),
      cause: error,
    })
  }
}

async function startInstall(context: ContextWithTerminals): Promise<{ sessionId?: string }> {
  try {
    const packageManager = (await detectPackageManager(context.cwd))?.name ?? 'npm'
    const install = addDependencyCommand(packageManager, 'oxlint@latest', { dev: true })
    const init = dlxCommand(packageManager, 'oxlint', { args: ['--init'], short: true })
    return startSetup(context, [install, init], 'Install Oxlint')
  } catch (error) {
    if (error instanceof Diagnostic) throw error
    throw diagnostics.OXDT0005({
      reason: error instanceof Error ? error.message : String(error),
      cause: error,
    })
  }
}

async function startSetup(
  context: ContextWithTerminals,
  commandLines: string[],
  title: string,
): Promise<{ sessionId?: string }> {
  const terminals = context.terminals
  if (terminals) {
    if (currentSessionId && terminals.sessions.get(currentSessionId)?.status === 'running')
      return { sessionId: currentSessionId }

    const command = commandLines.join(' && ')
    currentSessionId = `devtools-oxc:setup:${++runCount}`
    current = await terminals.startChildProcess(
      process.platform === 'win32'
        ? { command: 'cmd', args: ['/d', '/s', '/c', command], cwd: context.cwd }
        : { command: 'sh', args: ['-c', command], cwd: context.cwd },
      { id: currentSessionId, title, icon: 'ph:terminal-window-duotone' },
    )
    return { sessionId: currentSessionId }
  }

  current = undefined
  currentSessionId = undefined
  for (const commandLine of commandLines) {
    const [command, ...args] = commandLine.split(' ')
    const result = await x(command!, args, { nodeOptions: { cwd: context.cwd } })
    if (result.exitCode !== 0) {
      throw diagnostics.OXDT0005({
        reason: result.stderr.trim() || `Command exited with code ${result.exitCode ?? 'null'}.`,
      })
    }
  }
  return {}
}

async function waitForSetup(): Promise<void> {
  if (!current) return
  try {
    const result = await current.getResult()
    if (result.exitCode !== 0) {
      throw diagnostics.OXDT0005({
        reason:
          result.stderr.trim() ||
          `Migration command exited with code ${result.exitCode ?? 'null'}.`,
      })
    }
  } catch (error) {
    if (error instanceof Diagnostic) throw error
    throw diagnostics.OXDT0005({
      reason: error instanceof Error ? error.message : String(error),
      cause: error,
    })
  }
}

export const oxlintInstall = defineOxcRpc({
  name: 'devtools-oxc:install-oxlint',
  type: 'action',
  setup: context => ({
    handler: () => startInstall(context as ContextWithTerminals),
  }),
})

export const oxlintWaitForSetup = defineOxcRpc({
  name: 'devtools-oxc:wait-for-setup',
  type: 'action',
  setup: () => ({ handler: waitForSetup }),
})
