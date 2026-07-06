import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { VueElementConstructor } from 'vue'
import { defineCustomElement } from 'vue'
import css from '../.generated/css'
import Component from './dock/DockEmbedded.vue'

export const DOCK_EMBEDDED_TAG = 'vite-devtools-dock-embedded'

/**
 * The embedded dock custom-element constructor.
 *
 * `defineCustomElement` is pure — it only builds the class. Registering the
 * element with the global `customElements` registry is deferred to
 * {@link registerDockEmbedded} so importing this module stays side-effect-free
 * (honoring the package's `sideEffects: false`).
 */
export const DockEmbedded = defineCustomElement(
  Component,
  {
    shadowRoot: true,
    styles: [css],
  },
) as VueElementConstructor<{
  context: DocksContext
}>

/**
 * Register the embedded dock as a custom element and return its constructor.
 *
 * Idempotent and safe to call in environments without a `customElements`
 * registry (returns the constructor unchanged). Instantiating the constructor
 * with `new` requires the element to be registered first, so call this before
 * constructing one.
 */
export function registerDockEmbedded(): VueElementConstructor<{ context: DocksContext }> {
  if (typeof customElements !== 'undefined' && !customElements.get(DOCK_EMBEDDED_TAG))
    customElements.define(DOCK_EMBEDDED_TAG, DockEmbedded)
  return DockEmbedded
}
