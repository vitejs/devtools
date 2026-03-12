import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { VueElementConstructor } from 'vue'
import { defineCustomElement } from 'vue'
import css from '../.generated/css'
import Component from './DockStandalone.vue'

export const DockStandalone = defineCustomElement(
  Component,
  {
    shadowRoot: true,
    styles: [css],
  },
) as VueElementConstructor<{
  context: DocksContext
}>

if (!customElements.get('vite-devtools-dock-standalone'))
  customElements.define('vite-devtools-dock-standalone', DockStandalone)
