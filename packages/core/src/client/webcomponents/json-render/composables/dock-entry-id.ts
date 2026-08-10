import type { InjectionKey } from 'vue'

/**
 * Injection key for the current dock entry's id. `ViewJsonRender.vue`
 * `provide()`s it once per dock; any json-render component or composable that
 * needs an identity scoped to "this dock" — e.g. {@link useUncontrolledValue}'s
 * session-persistence key, or a per-dock scroll position — `inject()`s it
 * instead of threading the id through every registry component's props.
 */
export const DOCK_ENTRY_ID_KEY: InjectionKey<string | undefined> = Symbol('vite-devtools:dock-entry-id')
