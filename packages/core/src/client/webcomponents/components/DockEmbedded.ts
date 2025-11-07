import type { VueElementConstructor } from 'vue'
import type { DocksContext } from '../state/dock'
import { defineCustomElement } from 'vue'
import css from '../.generated/css'
import Component from './DockEmbedded.vue'

export const DockEmbedded = defineCustomElement(
  Component,
  {
    shadowRoot: true,
    styles: [css],
  },
) as VueElementConstructor<{
  context: DocksContext
}>

customElements.define('vite-devtools-dock-embedded', DockEmbedded)
