import type { DevframeDocksUserSettings } from '@devframes/hub/types'

/**
 * Vite DevTools user settings — the hub's {@link DevframeDocksUserSettings}
 * widened with Vite-flavored toggles that only Vite DevTools ships.
 *
 * The extra fields are optional so the hub's `DEFAULT_STATE_USER_SETTINGS()`
 * (which knows nothing about them) stays assignable; an absent value reads as
 * its documented default.
 */
export interface DevToolsDocksUserSettings extends DevframeDocksUserSettings {
  /**
   * Reveal the Devframe Inspector dock (the "DevTools for the DevTools"
   * meta-introspection panel). Hidden by default — an absent value keeps the
   * dock out of the dock bar until the user opts in from Settings → Advanced.
   */
  showDevframeInspector?: boolean
}
