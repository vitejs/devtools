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
import { startSetup, waitForSetup } from './setup'

const eslintConfigFiles = [
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.cjs',
  'eslint.config.ts',
  'eslint.config.mts',
  'eslint.config.cts',
]

type ContextWithTerminals = DevframeNodeContext & { terminals?: DevToolsTerminalHost }
export function needsOxlintMigration(root: string): boolean {
  return (
    eslintConfigFiles.some(file => existsSync(join(root, file))) &&
    !Object.entries(CONFIG_FILES).some(
      ([file, config]) => config.tool === 'oxlint' && existsSync(join(root, file)),
    )
  )
}

async function getSetupCommands(root: string, migrate: boolean): Promise<string[]> {
  const packageManager = (await detectPackageManager(root))?.name ?? 'npm'
  const install = addDependencyCommand(packageManager, 'oxlint@latest', { dev: true })
  const setup = migrate
    ? dlxCommand(packageManager, '@oxlint/migrate', { short: true })
    : dlxCommand(packageManager, 'oxlint', { args: ['--init'], short: true })
  return [install, setup]
}

async function isGitDirty(root: string): Promise<boolean> {
  try {
    const result = await x('git', ['-C', root, 'status', '--porcelain'], {
      nodeOptions: { cwd: root },
    })
    return result.exitCode === 0 && Boolean(result.stdout.trim())
  } catch {
    return false
  }
}

async function startMigration(context: ContextWithTerminals): Promise<{ sessionId?: string }> {
  const root = context.cwd
  if (!needsOxlintMigration(root))
    throw diagnostics.OXDT0005({ reason: 'No eligible ESLint config was found.' })

  try {
    return startSetup(context, await getSetupCommands(root, true), 'Migrate ESLint to Oxlint')
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
    return startSetup(context, await getSetupCommands(context.cwd, false), 'Install Oxlint')
  } catch (error) {
    if (error instanceof Diagnostic) throw error
    throw diagnostics.OXDT0005({
      reason: error instanceof Error ? error.message : String(error),
      cause: error,
    })
  }
}

export const oxlintMigrate = defineOxcRpc({
  name: 'devtools-oxc:migrate-eslint',
  type: 'action',
  setup: context => ({
    handler: () => startMigration(context as ContextWithTerminals),
  }),
})

export const oxlintSetupPreview = defineOxcRpc({
  name: 'devtools-oxc:setup-preview',
  type: 'query',
  jsonSerializable: true,
  setup: context => ({
    handler: async ({ migrate }: { migrate: boolean }) => {
      const canMigrate = needsOxlintMigration(context.cwd)
      const command = (await getSetupCommands(context.cwd, migrate && canMigrate)).join(' && ')
      return {
        canMigrate,
        command,
        gitDirty: await isGitDirty(context.cwd),
      }
    },
  }),
})

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
