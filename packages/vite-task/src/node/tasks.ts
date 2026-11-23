import type { GetPlanOptions, RunPlan, TaskGraph } from '../shared/types'
import { statSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { x } from 'tinyexec'
import { isVitePlusVersionSupported } from '../shared/version'
import { diagnostics } from './diagnostics'

const versionChecks = new Map<string, { mtimeMs: number, check: Promise<void> }>()
const taskSelectorsByWorkspace = new Map<string, Map<string, string[]>>()

async function execute(workspaceRoot: string, executable: string, args: string[]): Promise<string> {
  const command = `vp ${args.join(' ')}`
  try {
    const result = await x(executable, args, {
      nodeOptions: { cwd: workspaceRoot },
      throwOnError: true,
    })
    return result.stdout
  }
  catch (cause) {
    throw diagnostics.VTKDT0003({ command, reason: String(cause), cause })
  }
}

async function checkVersion(workspaceRoot: string, executable: string): Promise<void> {
  const output = await execute(workspaceRoot, executable, ['--version'])
  const match = /^vp v?(\d+\.\d+\.\d+(?:-[\w.-]+)?)(?:\+\S+)?\s*$/m.exec(output)
  if (!match)
    throw diagnostics.VTKDT0003({ command: 'vp --version', reason: `Unrecognized version output: ${output.trim()}` })
  if (!isVitePlusVersionSupported(match[1]!))
    throw diagnostics.VTKDT0002({ version: match[0].trim() })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function runJson(workspaceRoot: string, args: string[], format: 'graph'): Promise<TaskGraph>
function runJson(workspaceRoot: string, args: string[], format: 'plan'): Promise<RunPlan>
async function runJson(workspaceRoot: string, args: string[], format: 'graph' | 'plan'): Promise<TaskGraph | RunPlan> {
  const executable = join(workspaceRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'vp.cmd' : 'vp')
  const stat = statSync(executable, { throwIfNoEntry: false })
  if (!stat)
    throw diagnostics.VTKDT0001({ executable })

  if (versionChecks.get(executable)?.mtimeMs !== stat.mtimeMs) {
    const check = checkVersion(workspaceRoot, executable).catch((error) => {
      if (versionChecks.get(executable)?.check === check)
        versionChecks.delete(executable)
      throw error
    })
    versionChecks.set(executable, { mtimeMs: stat.mtimeMs, check })
  }
  await versionChecks.get(executable)!.check

  const json = await execute(workspaceRoot, executable, args)
  let value: unknown
  try {
    value = JSON.parse(json)
  }
  catch (cause) {
    throw diagnostics.VTKDT0004({ command: `vp ${args.join(' ')}`, cause })
  }
  if (!isRecord(value) || value.version !== 1 || typeof value.$schema !== 'string' || typeof value.workspaceRoot !== 'string'
    || !(format === 'graph' ? isRecord(value.tasks) && isRecord(value.packages) : isRecord(value.plan))) {
    throw diagnostics.VTKDT0004({ command: `vp ${args.join(' ')}` })
  }
  return value as TaskGraph | RunPlan
}

export async function loadTaskGraph(workspaceRoot: string): Promise<TaskGraph> {
  const graph = await runJson(workspaceRoot, ['run', '--json'], 'graph')
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
  if (typeof options.task !== 'string' || !options.task.trim() || options.task.startsWith('-'))
    throw diagnostics.VTKDT0005({ task: String(options.task) })
  // Refresh reloads the graph when task selectors become stale.
  if (!taskSelectorsByWorkspace.get(workspaceRoot)?.has(options.task))
    await loadTaskGraph(workspaceRoot)
  const selector = taskSelectorsByWorkspace.get(workspaceRoot)?.get(options.task)
  if (!selector)
    throw diagnostics.VTKDT0005({ task: options.task })

  return runJson(workspaceRoot, ['run', '--dry-run', '--json', ...(options.verbose ? ['-vv'] : []), ...selector], 'plan')
}
