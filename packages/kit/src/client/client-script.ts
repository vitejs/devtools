import type { DockEntryState, DocksContext } from 'devframe/client'
import type { DevToolsLogsClient } from 'devframe/types'

/**
 * Context for client scripts running in dock entries
 */
export interface DockClientScriptContext extends DocksContext {
  /**
   * The state of the current dock entry
   */
  current: DockEntryState
  /**
   * Logs client scoped to this dock entry's source
   */
  logs: DevToolsLogsClient
}
