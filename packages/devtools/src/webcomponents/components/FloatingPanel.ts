import type { VueElementConstructor } from 'vue'
import type { FloatingPanelProps } from './FloatingPanelProps'
import { defineCustomElement } from 'vue'
import css from '../.generated/css'
import Component from './FloatingPanel.vue'

export const FloatingPanel = defineCustomElement(
  Component,
  {
    shadowRoot: true,
    styles: [css],
  },
) as VueElementConstructor<FloatingPanelProps>

customElements.define('vite-devtools-floating-panel', FloatingPanel)
