import type { DevToolsNodeContext } from '../../../../kit/src'
import { existsSync } from 'node:fs'
import process from 'node:process'
import { join } from 'pathe'
import { RolldownLogsManager } from '../rolldown/logs-manager'

const weakMap = new WeakMap<DevToolsNodeContext, RolldownLogsManager>()

export function getLogsManager(context: DevToolsNodeContext): RolldownLogsManager {
  let manager = weakMap.get(context)!
  if (!manager) {
    const dirs = [
      join(context.cwd, '.rolldown'),
      join(process.cwd(), '.rolldown'),
    ]
    const dir = dirs.find(dir => existsSync(dir))
    if (!dir) {
      console.warn('[Vite DevTools] Rolldown logs directory `.rolldown` not found, you might want to run build with `build.rolldownOptions.debug` enabled first.')
    }
    manager = new RolldownLogsManager(dir ?? dirs[0]!)
  }
  return manager
}

export function setLogsManager(context: DevToolsNodeContext, manager: RolldownLogsManager) {
  weakMap.set(context, manager)
}
