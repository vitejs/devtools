import type { VueElementConstructor } from 'vue'
import type { DockProps } from '../types/DockProps'
import { defineCustomElement } from 'vue'
import css from '../.generated/css'
import Component from './DockEmbedded.vue'

export const DockEmbedded = defineCustomElement(
  Component,
  {
    shadowRoot: true,
    styles: [css],
  },
) as VueElementConstructor<DockProps>

customElements.define('vite-devtools-dock-embedded', DockEmbedded)
