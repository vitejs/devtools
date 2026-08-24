import type { DevToolsTerminalHost } from '@vitejs/devtools-kit'
import type { DevframeNodeContext } from 'devframe/types'
import { existsSync } from 'node:fs'
import { isPackageExists } from 'local-pkg'
import { addDependencyCommand, detectPackageManager, dlxCommand } from 'nypm'
import { Diagnostic } from 'nostics'
import { join } from 'pathe'
import { x } from 'tinyexec'
import { diagnostics } from '../../diagnostics'
import { defineOxcRpc } from '../_define'
import { startSetup } from './setup'

type ContextWithTerminals = DevframeNodeContext & { terminals?: DevToolsTerminalHost }
export type OxfmtMigration = 'prettier' | 'biome'

export function getOxfmtMigration(root: string): OxfmtMigration | undefined {
  if (isPackageExists('prettier', { paths: [root] })) return 'prettier'
  if (existsSync(join(root, 'biome.json')) || existsSync(join(root, 'biome.jsonc'))) return 'biome'
}

async function getSetupCommands(root: string, migrate: boolean): Promise<string[]> {
  const packageManager = (await detectPackageManager(root))?.name ?? 'npm'
  const install = addDependencyCommand(packageManager, 'oxfmt@latest', { dev: true })
  const migration = migrate ? getOxfmtMigration(root) : undefined
  const args = migration ? [`--migrate=${migration}`] : ['--init']
  return [install, dlxCommand(packageManager, 'oxfmt', { args, short: true })]
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

async function startOxfmtSetup(
  context: ContextWithTerminals,
  migrate: boolean,
): Promise<{ sessionId?: string }> {
  try {
    const migration = migrate ? getOxfmtMigration(context.cwd) : undefined
    return startSetup(
      context,
      await getSetupCommands(context.cwd, Boolean(migration)),
      migration
        ? `Migrate ${migration === 'prettier' ? 'Prettier' : 'Biome'} to Oxfmt`
        : 'Install Oxfmt',
      diagnostics.OXDT0006,
    )
  } catch (error) {
    if (error instanceof Diagnostic) throw error
    throw diagnostics.OXDT0006({
      reason: error instanceof Error ? error.message : String(error),
      cause: error,
    })
  }
}

export const oxfmtSetup = defineOxcRpc({
  name: 'devtools-oxc:setup-oxfmt',
  type: 'action',
  setup: context => ({
    handler: ({ migrate }: { migrate: boolean }) =>
      startOxfmtSetup(context as ContextWithTerminals, migrate),
  }),
})

export const oxfmtSetupPreview = defineOxcRpc({
  name: 'devtools-oxc:oxfmt-setup-preview',
  type: 'query',
  jsonSerializable: true,
  setup: context => ({
    handler: async ({ migrate }: { migrate: boolean }) => {
      const migration = getOxfmtMigration(context.cwd)
      return {
        canMigrate: Boolean(migration),
        migration,
        command: (await getSetupCommands(context.cwd, migrate)).join(' && '),
        gitDirty: await isGitDirty(context.cwd),
      }
    },
  }),
})
