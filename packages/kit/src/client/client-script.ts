import type { DockEntryState, DocksContext } from 'devframe/client'
import type { DevToolsMessagesClient } from 'devframe/types'

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
  /**
   * @deprecated Use `messages` instead. Will be removed in a future release.
   */
  readonly logs: DevToolsMessagesClient
}
