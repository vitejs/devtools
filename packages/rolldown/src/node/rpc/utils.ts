import type { DevToolsNodeContext } from '@vitejs/devtools-kit'
import { existsSync } from 'node:fs'
import process from 'node:process'
import { join } from 'pathe'
import { logger } from '../diagnostics'
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
      logger.RDDT0001().log()
    }
    manager = new RolldownLogsManager(dir ?? dirs[0]!)
  }
  return manager
}

export function setLogsManager(context: DevToolsNodeContext, manager: RolldownLogsManager) {
  weakMap.set(context, manager)
}
