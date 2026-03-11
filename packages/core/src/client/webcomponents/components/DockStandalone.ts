import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { VueElementConstructor } from 'vue'
import { defineCustomElement } from 'vue'
import css from '../.generated/css'
import Component from './DockStandalone.vue'

const forcedColorModeCss = `
:host([data-vite-devtools-color-mode='dark']) {
  color-scheme: dark;
}
:host([data-vite-devtools-color-mode='light']) {
  color-scheme: light;
}
`

export const DockStandalone = defineCustomElement(
  Component,
  {
    shadowRoot: true,
    styles: [css, forcedColorModeCss],
  },
) as VueElementConstructor<{
  context: DocksContext
}>

if (!customElements.get('vite-devtools-dock-standalone'))
  customElements.define('vite-devtools-dock-standalone', DockStandalone)
