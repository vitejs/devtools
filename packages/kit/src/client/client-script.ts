import type { DevToolsMessagesClient } from '../types/messages'
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
   * Messages client scoped to this dock entry's source
   */
  messages: DevToolsMessagesClient
}
