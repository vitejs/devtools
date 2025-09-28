import type { VueElementConstructor } from 'vue'
import type { DockProps } from './DockProps'
import { defineCustomElement } from 'vue'
import css from '../.generated/css'
import Component from './Dock.vue'

export const Dock = defineCustomElement(
  Component,
  {
    shadowRoot: true,
    styles: [css],
  },
) as VueElementConstructor<DockProps>

customElements.define('vite-devtools-dock', Dock)
