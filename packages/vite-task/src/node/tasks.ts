import type { GetPlanOptions, RunPlan, TaskGraph } from '../shared/types'
import { statSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { x } from 'tinyexec'
import { diagnostics } from './diagnostics'

const versionChecks = new Map<string, { mtimeMs: number, check: Promise<void> }>()
const taskSelectorsByWorkspace = new Map<string, Map<string, string[]>>()
const planAbortControllers = new Map<string, AbortController>()

async function execute(workspaceRoot: string, executable: string, args: string[], signal?: AbortSignal): Promise<string> {
  const command = `vp ${args.join(' ')}`
  signal?.throwIfAborted()
  try {
    const result = await x(executable, args, {
      nodeOptions: { cwd: workspaceRoot },
      throwOnError: true,
      signal,
    })
    signal?.throwIfAborted()
    return result.stdout
  }
  catch (cause) {
    signal?.throwIfAborted()
    throw diagnostics.VTKDT0003({ command, reason: String(cause), cause })
  }
}

async function checkVersion(workspaceRoot: string, executable: string): Promise<void> {
  const output = await execute(workspaceRoot, executable, ['--version'])
  const match = /^vp v?(\d+)\.(\d+)\.(\d+)(-[\w.-]+)?(?:\+\S+)?\s*$/m.exec(output)
  if (!match)
    throw diagnostics.VTKDT0003({ command: 'vp --version', reason: `Unrecognized version output: ${output.trim()}` })
  const [, major, minor, patch, prerelease] = match
  const supported = Number(major) > 1 || (Number(major) === 1 && (Number(minor) > 6 || (Number(minor) === 6 && (Number(patch) > 0 || !prerelease))))
  if (!supported)
    throw diagnostics.VTKDT0002({ version: match[0].trim() })
}

async function runJson<T>(workspaceRoot: string, args: string[], signal?: AbortSignal): Promise<T> {
  signal?.throwIfAborted()
  const executable = join(workspaceRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'vp.cmd' : 'vp')
  const stat = statSync(executable, { throwIfNoEntry: false })
  if (!stat)
    throw diagnostics.VTKDT0001({ executable })

  if (versionChecks.get(executable)?.mtimeMs !== stat.mtimeMs) {
    // Shared version checks continue even when a plan request is cancelled.
    const check = checkVersion(workspaceRoot, executable).catch((error) => {
      if (versionChecks.get(executable)?.check === check)
        versionChecks.delete(executable)
      throw error
    })
    versionChecks.set(executable, { mtimeMs: stat.mtimeMs, check })
  }
  await versionChecks.get(executable)!.check

  const json = await execute(workspaceRoot, executable, args, signal)
  try {
    return JSON.parse(json) as T
  }
  catch (cause) {
    throw diagnostics.VTKDT0004({ command: `vp ${args.join(' ')}`, cause })
  }
}

export async function loadTaskGraph(workspaceRoot: string, signal?: AbortSignal): Promise<TaskGraph> {
  const graph = await runJson<TaskGraph>(workspaceRoot, ['run', '--json'], signal)
  const taskSelectors = new Map<string, string[]>()
  for (const [id, task] of Object.entries(graph.tasks)) {
    // Graph IDs use package paths; the CLI expects package names or a directory filter.
    const packageName = graph.packages[task.package]?.name
    taskSelectors.set(id, task.package === '.'
      ? [task.name]
      : packageName
        ? [`${packageName}#${task.name}`]
        : ['--filter', `./${task.package}`, '--fail-if-no-match', task.name])
  }
  taskSelectorsByWorkspace.set(workspaceRoot, taskSelectors)
  return graph
}

export async function loadRunPlan(workspaceRoot: string, options: GetPlanOptions): Promise<RunPlan> {
  planAbortControllers.get(workspaceRoot)?.abort()
  const controller = new AbortController()
  planAbortControllers.set(workspaceRoot, controller)
  try {
    if (typeof options.task !== 'string' || !options.task.trim() || options.task.startsWith('-'))
      throw diagnostics.VTKDT0005({ task: String(options.task) })
    // Refresh reloads the graph when task selectors become stale.
    if (!taskSelectorsByWorkspace.get(workspaceRoot)?.has(options.task))
      await loadTaskGraph(workspaceRoot, controller.signal)
    const selector = taskSelectorsByWorkspace.get(workspaceRoot)?.get(options.task)
    if (!selector)
      throw diagnostics.VTKDT0005({ task: options.task })

    return await runJson(workspaceRoot, ['run', '--dry-run', '--json', ...(options.verbose ? ['-vv'] : []), ...selector], controller.signal)
  }
  catch (error) {
    controller.signal.throwIfAborted()
    throw error
  }
  finally {
    if (planAbortControllers.get(workspaceRoot) === controller)
      planAbortControllers.delete(workspaceRoot)
  }
}
