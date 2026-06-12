export interface HmrUpdate {
  /**
   *  Auto-incremented identifier, unique within the current session.
   */
  id: string
  /**
   *  Unix timestamp (ms) when the update was received.
   */
  timestamp: number
  /**
   *  Whether the change was a hot module replacement or a full page reload.
   */
  type: 'update' | 'full-reload'
  /**
   *  Absolute paths of the files that triggered the update.
   */
  files: string[]
  /**
   *  Module IDs (or URLs) invalidated by the change.
   */
  modules: string[]
  /**
   * Time in milliseconds the update took to apply, if measured.
   */
  duration?: number
}
