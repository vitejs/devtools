import type { DevframeNodeContext } from 'devframe/types'
import { join } from 'pathe'
import { OxlintLogsManager } from '../utils/logs-manager'

const weakMap = new WeakMap<DevframeNodeContext, OxlintLogsManager>()

export function getLogsManager(context: DevframeNodeContext): OxlintLogsManager {
  let manager = weakMap.get(context)!
  if (!manager) {
    const dir = join(context.cwd ?? process.cwd(), '.devtools-oxc', 'lint')
    manager = new OxlintLogsManager(dir)
    weakMap.set(context, manager)
  }
  return manager
}

export function setLogsManager(context: DevframeNodeContext, manager: OxlintLogsManager) {
  weakMap.set(context, manager)
}
