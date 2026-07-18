import { defineRpcFunction, type KitNodeContext } from '@vitejs/devtools-kit'
import { Diagnostic } from 'nostics'
import { x } from 'tinyexec'
import { diagnostics } from '../../diagnostics'
import { getOxcConfigFiles } from '../../utils/config-files'
import { ensureOxcGitignored, parseOxlintOutput } from '../../utils/oxlint'
import { getLintResultsManager } from '../utils'

export const oxlintRun = defineRpcFunction({
  name: 'devtools-oxc:run-lint',
  type: 'action',
  setup: context => {
    let running: Promise<number> | undefined
    return {
      handler: () => {
        running ??= runLint(context).finally(() => {
          running = undefined
        })
        return running
      },
    }
  },
})

async function runLint(context: KitNodeContext) {
  const { terminals } = context
  const root = context.cwd
  const timestamp = Date.now()
  let terminal: Awaited<ReturnType<typeof terminals.startChildProcess>> | undefined

  try {
    await ensureOxcGitignored(root)
    const versionResult = await x('oxlint', ['--version'], { nodeOptions: { cwd: root } })
    const version = versionResult.stdout.trim().split(/\s+/).at(-1)
    if (versionResult.exitCode !== 0 || !version)
      throw diagnostics.OXDT0001({
        reason: versionResult.stderr.trim() || 'Unable to read the oxlint version',
      })

    terminal = await terminals.startChildProcess(
      {
        command: 'oxlint',
        args: ['-f', 'json'],
        cwd: root,
        env: { FORCE_COLOR: '0', NO_COLOR: '1' },
      },
      {
        id: `devtools-oxc:lint:${timestamp}`,
        title: 'Oxlint',
        icon: 'ph:terminal-window-duotone',
      },
    )
    const { stdout, stderr, exitCode } = await terminal.getResult()
    if (exitCode === undefined)
      throw diagnostics.OXDT0001({ reason: 'Oxlint was terminated before it completed' })

    let output
    try {
      output = await parseOxlintOutput(stdout, root)
    } catch (error) {
      throw diagnostics.OXDT0001({
        reason: stderr.trim() || 'Oxlint returned invalid JSON',
        cause: error,
      })
    }
    if (!output) throw diagnostics.OXDT0001({ reason: 'Oxlint returned an invalid JSON result' })

    const config = (await getOxcConfigFiles(root)).filter(file => file.tool === 'oxlint')
    await getLintResultsManager(context).create(
      { version, timestamp, summary: output.summary },
      { files: output.files, config },
    )
    terminals.update({ ...terminal, status: 'stopped' })
    return timestamp
  } catch (error) {
    if (terminal) terminals.update({ ...terminal, status: 'error' })
    if (error instanceof Diagnostic) throw error
    throw diagnostics.OXDT0001({
      reason: error instanceof Error ? error.message : String(error),
      cause: error,
    })
  }
}
