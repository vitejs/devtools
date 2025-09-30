import type { DevToolsNodeContext } from '@vitejs/devtools-kit'
import { join } from 'pathe'
import { RolldownLogsManager } from '../rolldown/logs-manager'

const weakMap = new WeakMap<DevToolsNodeContext, RolldownLogsManager>()

export function getLogsManager(context: DevToolsNodeContext): RolldownLogsManager {
  let manager = weakMap.get(context)!
  if (!manager) {
    manager = new RolldownLogsManager(join(context.cwd, '.rolldown'))
  }
  return manager
}

export function setLogsManager(context: DevToolsNodeContext, manager: RolldownLogsManager) {
  weakMap.set(context, manager)
}
