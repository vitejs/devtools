import type { DevToolsDockEntry } from '../types'
import type { DockEntryState, DocksContext } from './docks'

/**
 * Context for client scripts running in dock entries
 */
export interface DockClientScriptContext extends DocksContext {
  /**
   * The state if the current dock entry
   */
  current: DockEntryState
}

export interface DockClientScriptCurrent {
  /**
   * The dock entry info of the current dock item
   */
  entryMeta: DevToolsDockEntry

  /**
   * The current state of the dock
   */
  state: 'active' | 'inactive'

  /**
   * The panel element to mount into, when the entry type is `custom-render`
   */
  elPanel?: HTMLDivElement | null

  /**
   * The iframe element to mount into, when the entry type is `iframe`
   */
  elIframe?: HTMLIFrameElement | null

  /**
   * The dock icon element
   */
  elDockIcon?: HTMLDivElement | null
}
