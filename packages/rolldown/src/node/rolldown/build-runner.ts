import type { DevToolsChildProcessExecuteOptions, ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import process from 'node:process'
import { diagnostics } from '../diagnostics'

/**
 * Base for the terminal-session id. A monotonic counter is appended per run so
 * each build gets a unique id — a finished session can linger registered, and
 * reusing a fixed id would throw "Terminal session ... already registered".
 */
const BUILD_SESSION_ID_BASE = 'vite:rolldown:build'
/**
 * Env var the spawned build carries so the Rolldown DevTools plugin forces
 * `rolldownOptions.devtools` on for that build (see `plugin.ts`).
 */
export const ROLLDOWN_DEVTOOLS_ENV = 'VITE_DEVTOOLS_ROLLDOWN'

type BuildSession = Awaited<ReturnType<ViteDevToolsNodeContext['terminals']['startChildProcess']>>

/** The latest build session (module-scoped, like the Vitest launcher). */
let current: BuildSession | undefined
/** Id of {@link current}, so a still-running build can be reused. */
let currentSessionId: string | undefined
/** Monotonic run counter, appended to make each session id unique. */
let runCount = 0

export interface RunBuildResult {
  sessionId: string
  /** True when a build was already running and we reused its session. */
  alreadyRunning: boolean
}

export interface WaitBuildResult {
  /** Process exit code, or `null` when there is no build to await. */
  exitCode: number | null
}

/**
 * The child process the "Run build" button spawns. Exposed so the confirmation
 * dialog can show exactly what will run before the user commits to it.
 */
export function getBuildCommand(context: ViteDevToolsNodeContext): DevToolsChildProcessExecuteOptions {
  return {
    command: 'vite',
    args: ['build'],
    cwd: context.cwd ?? process.cwd(),
    env: { [ROLLDOWN_DEVTOOLS_ENV]: 'true' },
  }
}

/**
 * Spawn `vite build` with Rolldown's devtools output forced on. Returns
 * immediately once the child is spawned and its terminal session registered —
 * completion is awaited separately via {@link waitForBuild}.
 */
export async function startBuild(context: ViteDevToolsNodeContext): Promise<RunBuildResult> {
  // Idempotent: a still-running build just reuses its session.
  if (currentSessionId) {
    const existing = context.terminals.sessions.get(currentSessionId)
    if (existing?.status === 'running')
      return { sessionId: currentSessionId, alreadyRunning: true }
  }

  // A finished/dead session may linger — terminate it before re-spawning.
  if (current)
    await current.terminate().catch(() => {})

  // Fresh, unique id per run so re-registration never collides.
  const sessionId = `${BUILD_SESSION_ID_BASE}-${++runCount}`

  try {
    current = await context.terminals.startChildProcess(
      getBuildCommand(context),
      {
        id: sessionId,
        title: `Rolldown build #${runCount}`,
        // The Terminals panel only renders icons its SPA statically ships;
        // use a terminal icon it bundles.
        icon: 'ph:terminal-window-duotone',
      },
    )
    currentSessionId = sessionId
  }
  catch (error) {
    throw diagnostics.RDDT0003({ error: error instanceof Error ? error.message : String(error) })
  }

  return { sessionId, alreadyRunning: false }
}

/** Resolve once the spawned build exits. */
export async function waitForBuild(): Promise<WaitBuildResult> {
  if (!current)
    return { exitCode: null }
  try {
    const result = await current.getResult()
    return { exitCode: result.exitCode ?? null }
  }
  catch {
    return { exitCode: null }
  }
}
