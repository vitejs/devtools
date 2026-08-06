import type { VueElementConstructor } from 'vue'
import type { DevToolsDocksContext } from '../state/context'
import { defineCustomElement } from 'vue'
import css from '../.generated/css'
import Component from './dock/DockEmbedded.vue'

export const DockEmbedded = defineCustomElement(
  Component,
  {
    shadowRoot: true,
    styles: [css],
  },
) as VueElementConstructor<{
  context: DevToolsDocksContext
}>

customElements.define('vite-devtools-dock-embedded', DockEmbedded)
