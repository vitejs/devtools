import type { RpcContext } from '@vitejs/devtools-kit'
import type { RolldownLogsManager } from '../rolldown/logs-manager'

export function getLogsManager(context: RpcContext): RolldownLogsManager {
  return context.meta!.manager
}
