import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'
import DisplayBadge from './DisplayBadge.vue'

const meta = {
  title: 'Display/DisplayBadge',
  component: DisplayBadge,
  tags: ['autodocs'],
  args: { text: 'vite', color: true },
  parameters: {
    docs: {
      description: {
        component: 'A text chip whose colour is derived deterministically from its text (or a fixed hue when `color` is a number).',
      },
    },
  },
} satisfies Meta<typeof DisplayBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** The hue is stable per string — the same text always maps to the same colour. */
export const Palette: Story = {
  render: () => ({
    setup: () => () => h('div', { class: 'flex flex-wrap gap-1.5 max-w-100 p6' }, ['vue', 'react', 'svelte', 'vite', 'unocss', 'nuxt', 'rolldown', 'esbuild']
      .map(text => h(DisplayBadge, { key: text, text }))),
  }),
}
