// Passive-mode wire constants shared between the node middleware and the
// injected client. Kept in core (not the kit) because passive mode is a
// Vite-DevTools overlay concern, not part of the framework-neutral kit surface.

/**
 * Filename of the passive-mode persistence endpoint, served under the DevTools
 * mount path next to `__connection.json`. A `POST { enabled }` flips the
 * per-project "normal mode" flag in the project's `node_modules`; the injection
 * plugin reads that flag directly to pick which client entry to inject.
 */
export const DEVTOOLS_MODE_FILENAME = '__mode.json'

/**
 * `window` event the mounted overlay dispatches to ask the injected client to
 * tear itself down and return to passive mode (from the "Hide DevTools"
 * command). Decouples the Vue-side command from the inject-side lifecycle.
 */
export const DEVTOOLS_HIDE_EVENT = 'vite-devtools:hide'
