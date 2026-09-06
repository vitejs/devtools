import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { Diagnostic } from 'nostics'
import { resolve } from 'pathe'
import { x } from 'tinyexec'
import { diagnostics } from '../../diagnostics'
import { isVitePlusInstalled } from '../../utils/vite-plus'
import { ensureOxcGitignored } from '../../utils/oxlint'
import { defineOxcRpc } from '../_define'
import { isGitDirty } from './oxfmt-setup'

type OxfmtCommand = { command: string; args: string[] }

export type OxfmtCheckLog = {
  status: 'clean' | 'issues' | 'error'
  files: { path: string; durationMs: number }[]
  summary: { durationMs: number; fileCount: number; threadCount: number }
  stdout: string
}

export type OxfmtCheckResult = OxfmtCheckLog & { timestamp: number }

export async function saveOxfmtCheckResult(root: string, log: OxfmtCheckLog) {
  const timestamp = Date.now()
  const dir = resolve(root, '.devtools-oxc', 'fmt', String(timestamp))
  await ensureOxcGitignored(root)
  await mkdir(dir, { recursive: true })
  await writeFile(resolve(dir, 'log.json'), JSON.stringify({ timestamp, ...log }, null, 2), 'utf-8')
}

export async function listOxfmtCheckResults(root: string): Promise<OxfmtCheckResult[]> {
  const dir = resolve(root, '.devtools-oxc', 'fmt')
  if (!existsSync(dir)) return []

  const results = await Promise.all(
    (await readdir(dir, { withFileTypes: true }))
      .filter(entry => entry.isDirectory() && /^\d+$/.test(entry.name))
      .sort((a, b) => Number(b.name) - Number(a.name))
      .map(async entry => {
        try {
          return JSON.parse(
            await readFile(resolve(dir, entry.name, 'log.json'), 'utf-8'),
          ) as OxfmtCheckResult
        } catch {
          return null
        }
      }),
  )
  return results.filter(result => result !== null)
}

export function parseOxfmtCheckOutput(stdout: string): OxfmtCheckLog {
  const status = stdout.includes('All matched files use the correct format.')
    ? 'clean'
    : /Format issues found in above \d+ files\./.test(stdout)
      ? 'issues'
      : 'error'
  const summary = stdout.match(/Finished in (\d+(?:\.\d+)?)ms on (\d+) files using (\d+) threads\./)

  return {
    status,
    files: [...stdout.matchAll(/^(.+) \((\d+(?:\.\d+)?)ms\)$/gm)].map(([, path, durationMs]) => ({
      path,
      durationMs: Number(durationMs),
    })),
    summary: {
      durationMs: Number(summary?.[1] ?? 0),
      fileCount: Number(summary?.[2] ?? 0),
      threadCount: Number(summary?.[3] ?? 0),
    },
    stdout,
  }
}

export function getOxfmtFormatCommand(write: boolean, vitePlus: boolean): OxfmtCommand {
  const option = write ? '--write' : '--check'
  if (vitePlus) return { command: 'vp', args: ['fmt', option] }
  return { command: 'oxfmt', args: [option] }
}

async function getPreview(root: string, write: boolean) {
  const command = getOxfmtFormatCommand(write, isVitePlusInstalled(root))
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
        const command = getOxfmtFormatCommand(write, isVitePlusInstalled(context.cwd))
        const result = await x(command.command, command.args, {
          nodeOptions: { cwd: context.cwd, env: { FORCE_COLOR: '0', NO_COLOR: '1' } },
        })
        if (!write) await saveOxfmtCheckResult(context.cwd, parseOxfmtCheckOutput(result.stdout))
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
