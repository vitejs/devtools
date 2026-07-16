import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'
import DisplayPluginName from './DisplayPluginName.vue'

const meta = {
  title: 'Display/DisplayPluginName',
  component: DisplayPluginName,
  tags: ['autodocs'],
  args: { name: 'vite:import-analysis' },
  parameters: {
    docs: { description: { component: 'Renders a plugin id with its namespace prefix coloured by hash; `compact` collapses well-known prefixes.' } },
  },
} satisfies Meta<typeof DisplayPluginName>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Compact: Story = { args: { name: 'vite:css-post', compact: true } }

export const List: Story = {
  render: () => ({
    setup: () => () => h('div', { class: 'flex flex-col gap-1 p6' }, ['vite:import-analysis', 'unocss:transformer', 'nuxt:pages', 'rollup:commonjs', 'my-custom-plugin']
      .map(name => h(DisplayPluginName, { key: name, name }))),
  }),
}
