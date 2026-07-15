import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'
import ViteDevTools from './ViteDevTools.vue'
import VitePlus from './VitePlus.vue'
import VitePlusCore from './VitePlusCore.vue'

const meta = {
  title: 'Brand/Logos',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'The Vite DevTools brand marks used across the dock and standalone shells.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj

/** The Vite+ mark (the minimized dock nub / auth screen logo). */
export const VitePlusMark: Story = {
  name: 'VitePlus',
  render: () => ({ setup: () => () => h('div', { class: 'w-24 h-24' }, h(VitePlus)) }),
}

/** The compact Vite+ core glyph shown in the collapsed dock. */
export const VitePlusCoreMark: Story = {
  name: 'VitePlusCore',
  render: () => ({ setup: () => () => h('div', { class: 'w-16 h-16' }, h(VitePlusCore)) }),
}

/** The full Vite DevTools wordmark (recolors with the theme). */
export const Wordmark: Story = {
  name: 'ViteDevTools',
  render: () => ({ setup: () => () => h('div', { class: 'w-80' }, h(ViteDevTools)) }),
}
