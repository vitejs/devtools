import type { DevToolsTerminalHost } from '@vitejs/devtools-kit'
import type { DevframeNodeContext } from 'devframe/types'
import { Diagnostic } from 'nostics'
import { x } from 'tinyexec'
import { diagnostics } from '../../diagnostics'

export type SetupContext = DevframeNodeContext & { terminals?: DevToolsTerminalHost }
type SetupSession = Awaited<ReturnType<DevToolsTerminalHost['startChildProcess']>>

let current: SetupSession | undefined
let currentSessionId: string | undefined
let runCount = 0
let setupDiagnostic = diagnostics.OXDT0005

export async function startSetup(
  context: SetupContext,
  commandLines: string[],
  title: string,
  diagnostic = diagnostics.OXDT0005,
): Promise<{ sessionId?: string }> {
  setupDiagnostic = diagnostic
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
      throw setupDiagnostic({
        reason: result.stderr.trim() || `Command exited with code ${result.exitCode ?? 'null'}.`,
      })
    }
  }
  return {}
}

export async function waitForSetup(): Promise<void> {
  if (!current) return
  try {
    const result = await current.getResult()
    if (result.exitCode !== 0) {
      throw setupDiagnostic({
        reason:
          result.stderr.trim() ||
          `Migration command exited with code ${result.exitCode ?? 'null'}.`,
      })
    }
  } catch (error) {
    if (error instanceof Diagnostic) throw error
    throw setupDiagnostic({
      reason: error instanceof Error ? error.message : String(error),
      cause: error,
    })
  }
}
