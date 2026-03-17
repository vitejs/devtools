import type { DevToolsLogsClient } from '../types/logs'
import type { DockEntryState, DocksContext } from './docks'

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
