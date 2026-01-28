import type { DevToolsNodeContext } from '@vitejs/devtools-kit'
import { existsSync } from 'node:fs'
import process from 'node:process'
import { join } from 'pathe'
import { RolldownLogsManager } from '../rolldown/logs-manager'

const weakMap = new WeakMap<DevToolsNodeContext, RolldownLogsManager>()

export function getLogsManager(context: DevToolsNodeContext): RolldownLogsManager {
  let manager = weakMap.get(context)!
  if (!manager) {
    const dirs = [
      join(context.cwd, 'node_modules', '.rolldown'),
      join(process.cwd(), 'node_modules', '.rolldown'),
    ]
    const dir = dirs.find(dir => existsSync(dir))
    if (!dir) {
      console.warn('[Rolldown DevTools] Rolldown logs directory `.rolldown` not found, you might want to run build with `build.rolldownOptions.devtools` enabled first.')
    }
    manager = new RolldownLogsManager(dir ?? dirs[0]!)
  }
  return manager
}

export function setLogsManager(context: DevToolsNodeContext, manager: RolldownLogsManager) {
  weakMap.set(context, manager)
}
