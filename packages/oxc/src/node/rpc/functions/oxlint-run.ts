import { Diagnostic } from 'nostics'
import { x } from 'tinyexec'
import { defineOxcRpc } from '../_define'
import { diagnostics } from '../../diagnostics'
import { getOxcConfigFiles } from '../../utils/config-files'
import { ensureOxcGitignored, parseOxlintOutput } from '../../utils/oxlint'
import { getVitePlusVersions, isVitePlusInstalled } from '../../utils/vite-plus'
import { getLintResultsManager } from '../utils'

export const oxlintRun = defineOxcRpc({
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

async function runLint(context: Parameters<typeof getLintResultsManager>[0]) {
  const root = context.cwd
  const timestamp = Date.now()

  try {
    await ensureOxcGitignored(root)
    const vitePlus = isVitePlusInstalled(root)
    let version = vitePlus ? (await getVitePlusVersions(root))?.oxlint : undefined
    if (!version) {
      const versionResult = await x('oxlint', ['--version'], { nodeOptions: { cwd: root } })
      version = versionResult.stdout.trim().split(/\s+/).at(-1)
      if (versionResult.exitCode !== 0 || !version)
        throw diagnostics.OXDT0001({
          reason: versionResult.stderr.trim() || 'Unable to read the oxlint version',
        })
    }

    const { stdout, stderr } = await x(
      vitePlus ? 'vp' : 'oxlint',
      vitePlus ? ['lint', '-f', 'json'] : ['-f', 'json'],
      {
        nodeOptions: {
          cwd: root,
          env: { FORCE_COLOR: '0', NO_COLOR: '1' },
        },
      },
    )

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
    return timestamp
  } catch (error) {
    if (error instanceof Diagnostic) throw error
    throw diagnostics.OXDT0001({
      reason: error instanceof Error ? error.message : String(error),
      cause: error,
    })
  }
}
