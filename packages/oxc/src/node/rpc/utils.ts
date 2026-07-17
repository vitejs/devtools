import type { DevframeNodeContext } from 'devframe/types'
import { join } from 'pathe'
import { LintResultsManager } from '../utils/lint-results-manager'

const weakMap = new WeakMap<DevframeNodeContext, LintResultsManager>()

export function getLintResultsManager(context: DevframeNodeContext): LintResultsManager {
  let manager = weakMap.get(context)!
  if (!manager) {
    const dir = join(context.cwd ?? process.cwd(), '.devtools-oxc', 'lint')
    manager = new LintResultsManager(dir)
    weakMap.set(context, manager)
  }
  return manager
}

export function setLintResultsManager(context: DevframeNodeContext, manager: LintResultsManager) {
  weakMap.set(context, manager)
}
