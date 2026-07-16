import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import process from 'node:process'
import { diagnostics } from '../diagnostics'

/** Fixed terminal-session id so repeat clicks reuse one session. */
export const BUILD_SESSION_ID = 'vite:rolldown:build'
/**
 * Env var read by core's `DevToolsRolldownBuildFlag` plugin to force
 * `rolldownOptions.devtools` on for the spawned build.
 */
const ROLLDOWN_DEVTOOLS_ENV = 'VITE_DEVTOOLS_ROLLDOWN'

type BuildSession = Awaited<ReturnType<ViteDevToolsNodeContext['terminals']['startChildProcess']>>

/** The single in-flight build session (module-scoped, like the Vitest launcher). */
let current: BuildSession | undefined

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
 * Spawn `vite build` with Rolldown's devtools output forced on. Returns
 * immediately once the child is spawned and its terminal session registered —
 * completion is awaited separately via {@link waitForBuild}.
 */
export async function startBuild(context: ViteDevToolsNodeContext): Promise<RunBuildResult> {
  const cwd = context.cwd ?? process.cwd()

  // Idempotent: a still-running build just reuses its session.
  const existing = context.terminals.sessions.get(BUILD_SESSION_ID)
  if (existing?.status === 'running')
    return { sessionId: BUILD_SESSION_ID, alreadyRunning: true }

  // A finished/dead session may linger — terminate it before re-spawning.
  if (current)
    await current.terminate().catch(() => {})

  try {
    current = await context.terminals.startChildProcess(
      {
        command: 'vite',
        args: ['build'],
        cwd,
        env: { [ROLLDOWN_DEVTOOLS_ENV]: 'true' },
      },
      {
        id: BUILD_SESSION_ID,
        title: 'Rolldown build',
        // The Terminals panel only renders icons its SPA statically ships;
        // use a terminal icon it bundles.
        icon: 'ph:terminal-window-duotone',
      },
    )
  }
  catch (error) {
    throw diagnostics.RDDT0003({ error: error instanceof Error ? error.message : String(error) })
  }

  return { sessionId: BUILD_SESSION_ID, alreadyRunning: false }
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
