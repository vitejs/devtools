import type { PackageManagerName } from 'nypm'
import { detectPackageManager } from 'nypm'
import { Diagnostic } from 'nostics'
import { x } from 'tinyexec'
import { diagnostics } from '../../diagnostics'
import { isVitePlusInstalled } from '../../utils/vite-plus'
import { defineOxcRpc } from '../_define'
import { isGitDirty } from './oxfmt-setup'

type OxfmtCommand = { command: string; args: string[] }

export function getOxfmtFormatCommand(
  packageManager: PackageManagerName | undefined,
  write: boolean,
  vitePlus: boolean,
): OxfmtCommand {
  const option = write ? '--write' : '--check'
  if (vitePlus) return { command: 'vp', args: ['fmt', option] }

  switch (packageManager) {
    case 'npm':
      return { command: 'npx', args: ['--no-install', 'oxfmt', option] }
    case 'pnpm':
      return { command: 'pnpm', args: ['exec', 'oxfmt', option] }
    case 'yarn':
      return { command: 'yarn', args: ['oxfmt', option] }
    case 'bun':
      return { command: 'bun', args: ['x', '--no-install', 'oxfmt', option] }
    default:
      return { command: 'oxfmt', args: [option] }
  }
}

async function getPreview(root: string, write: boolean) {
  const command = getOxfmtFormatCommand(
    (await detectPackageManager(root))?.name,
    write,
    isVitePlusInstalled(root),
  )
  return {
    command: [command.command, ...command.args].join(' '),
    gitDirty: write && (await isGitDirty(root)),
  }
}

export const oxfmtFormatPreview = defineOxcRpc({
  name: 'devtools-oxc:oxfmt-format-preview',
  type: 'query',
  jsonSerializable: true,
  setup: context => ({
    handler: ({ write }: { write: boolean }) => getPreview(context.cwd, write),
  }),
})

export const oxfmtRun = defineOxcRpc({
  name: 'devtools-oxc:run-format',
  type: 'action',
  jsonSerializable: true,
  setup: context => ({
    handler: async ({ write }: { write: boolean }) => {
      try {
        const command = getOxfmtFormatCommand(
          (await detectPackageManager(context.cwd))?.name,
          write,
          isVitePlusInstalled(context.cwd),
        )
        const result = await x(command.command, command.args, {
          nodeOptions: { cwd: context.cwd, env: { FORCE_COLOR: '0', NO_COLOR: '1' } },
        })
        return { exitCode: result.exitCode }
      } catch (error) {
        if (error instanceof Diagnostic) throw error
        throw diagnostics.OXDT0007({
          reason: error instanceof Error ? error.message : String(error),
          cause: error,
        })
      }
    },
  }),
})
