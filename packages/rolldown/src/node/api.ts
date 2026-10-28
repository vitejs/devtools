import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import { join } from 'pathe'
import { RolldownLogsManager } from './rolldown/logs-manager'

// Internal, unstable API for `@vitejs/devtools-agent`; do not use it directly.
export type { RolldownEventsReader } from './rolldown/events-reader'
export { getPackageMeta } from './rpc/functions/rolldown-get-packages'
export { createSessionCompareDetails } from './rpc/functions/rolldown-get-session-compare-details'
// Agent reads are scoped to the connected project, independently of UI fallback.
export function getLogsManager(context: ViteDevToolsNodeContext): RolldownLogsManager {
  return new RolldownLogsManager(join(context.cwd, 'node_modules', '.rolldown'))
}
