import type { InjectionKey } from 'vue'
import type { CommandStep, PlanStep, PlanTask, StepCache } from '../../shared/types'

export const isTaskInGraphKey: InjectionKey<(id: string) => boolean> = Symbol('vite-task:is-task-in-graph')
export const getTaskPackageKey: InjectionKey<(id: string) => string | undefined> = Symbol('vite-task:get-task-package')

export function isCommand(step: PlanStep): step is CommandStep {
  return typeof step.program === 'string'
}

export function orderedTaskIds(tasks: Record<string, PlanTask>, selected?: string) {
  const visited = new Set<string>()
  const ordered: string[] = []
  // Reserve the selected task before DFS so even a cycle cannot emit it early.
  if (selected)
    visited.add(selected)
  function visit(id: string) {
    const task = tasks[id]
    if (!task || visited.has(id))
      return
    visited.add(id)
    for (const dep of task.dependsOn || [])
      visit(dep)
    ordered.push(id)
  }
  for (const id of Object.keys(tasks))
    visit(id)
  if (selected && tasks[selected])
    ordered.push(selected)

  return ordered
}

function collectCommandSteps(steps: PlanStep[]): CommandStep[] {
  return steps.flatMap(step => isCommand(step) ? [step] : orderedTaskIds(step.plan).flatMap(id => collectCommandSteps(step.plan[id]!.steps)))
}

// Prefer actionable cache failures over uncertain or successful states.
const priority = ['hit', 'unknown', 'disabled', 'unavailable', 'noBaseline', 'changed', 'error']
function rank(value: string) {
  return priority.includes(value) ? priority.indexOf(value) : priority.indexOf('unavailable')
}

export function planRows(tasks: Record<string, PlanTask>, selected: string) {
  return orderedTaskIds(tasks, selected).map((id) => {
    const task = tasks[id]!
    const commandSteps = collectCommandSteps(task.steps)
    const statuses = commandSteps.map(step => step.cache?.status || 'unavailable')
    const status = statuses.reduce((worst, current) => rank(current) > rank(worst) ? current : worst, statuses[0] || 'unavailable')
    const cachedStepDurationsMs = commandSteps.flatMap(step => step.cache?.baseline ? [step.cache.baseline.durationMs] : [])
    return {
      id,
      task,
      cache: { status } satisfies StepCache,
      cachedDurationMs: cachedStepDurationsMs.length && cachedStepDurationsMs.length === commandSteps.length ? cachedStepDurationsMs.reduce((a, b) => a + b) : undefined,
      cachedStepDurationsMs,
      commands: commandSteps,
    }
  })
}

export type PlanRow = ReturnType<typeof planRows>[number]

export function programName(program: string) {
  return program.split(/[\\/]/).pop() || program
}

export function formatStepLabel(step: CommandStep) {
  return step.hook || step.args?.filter(arg => !arg.startsWith('-') && !/[\\/.]/.test(arg)).join(' ') || programName(step.program)
}

const cacheLabels: Record<string, string> = {
  unavailable: 'Cache unavailable',
  hit: 'Cache hit',
  changed: 'Inputs changed',
  unknown: '',
  noBaseline: 'No cached run yet',
  error: 'Cache check failed',
  disabled: 'Caching disabled',
}

export function cacheChangeHue(change: string) {
  switch (change) {
    case 'added': return 210
    case 'changed': return 108
    case 'removed': return 0
  }
}

export function cacheLabel(status = 'unavailable') {
  return cacheLabels[status] ?? status
}
