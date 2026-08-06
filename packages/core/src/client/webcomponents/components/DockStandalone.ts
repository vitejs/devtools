import type { VueElementConstructor } from 'vue'
import type { DevToolsDocksContext } from '../state/context'
import { defineCustomElement } from 'vue'
import css from '../.generated/css'
import Component from './dock/DockStandalone.vue'

export const DockStandalone = defineCustomElement(
  Component,
  {
    shadowRoot: true,
    styles: [css],
  },
) as VueElementConstructor<{
  context: DevToolsDocksContext
}>

if (!customElements.get('vite-devtools-dock-standalone'))
  customElements.define('vite-devtools-dock-standalone', DockStandalone)
