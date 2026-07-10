import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'
import HashBadge from './HashBadge.vue'

const meta = {
  title: 'Display/HashBadge',
  component: HashBadge,
  tags: ['autodocs'],
  decorators: [() => ({ template: '<div class="p6 font-sans"><story /></div>' })],
  args: { label: 'a11y' },
  parameters: {
    docs: {
      description: {
        component: 'A category/label chip whose colour is derived deterministically from the label text.',
      },
    },
  },
} satisfies Meta<typeof HashBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** The colour is stable per string — the same label always gets the same hue. */
export const Palette: Story = {
  render: () => ({
    setup: () => () => h('div', { class: 'flex flex-wrap gap-1.5 max-w-100 p6 font-sans' }, ['a11y', 'lint', 'runtime', 'test', 'network', 'build', 'hmr', 'plugin', 'vite', 'rolldown']
      .map(label => h(HashBadge, { key: label, label }))),
  }),
}
