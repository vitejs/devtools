import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import { existsSync } from 'node:fs'
import { join } from 'pathe'
import { diagnostics } from '../diagnostics'
import { RolldownLogsManager } from '../rolldown/logs-manager'

const weakMap = new WeakMap<ViteDevToolsNodeContext, RolldownLogsManager>()

export function getLogsManager(context: ViteDevToolsNodeContext): RolldownLogsManager {
  let manager = weakMap.get(context)!
  if (!manager) {
    const dir = join(context.cwd, 'node_modules', '.rolldown')
    if (!existsSync(dir)) {
      diagnostics.RDDT0001()
    }
    manager = new RolldownLogsManager(dir)
  }
  return manager
}

export function setLogsManager(context: ViteDevToolsNodeContext, manager: RolldownLogsManager) {
  weakMap.set(context, manager)
}
