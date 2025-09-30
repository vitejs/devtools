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
      join(context.cwd, '.rolldown'),
      join(process.cwd(), '.rolldown'),
    ]
    const dir = dirs.find(dir => existsSync(dir))
    if (!dir) {
      throw new Error('Rolldown logs directory not found')
    }
    manager = new RolldownLogsManager(dir)
  }
  return manager
}

export function setLogsManager(context: DevToolsNodeContext, manager: RolldownLogsManager) {
  weakMap.set(context, manager)
}
