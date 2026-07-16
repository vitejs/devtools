import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'
import FlowmapNode from './FlowmapNode.vue'

const meta = {
  title: 'Flowmap/FlowmapNode',
  component: FlowmapNode,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: 'A single node in the module/plugin flow graph: a rounded card with optional connector lines and an active state, filled via the `#content` slot.' } },
  },
} satisfies Meta<typeof FlowmapNode>

export default meta
type Story = StoryObj<typeof meta>

function label(text: string) {
  return h('span', { class: 'font-mono text-sm' }, text)
}

export const Default: Story = {
  render: () => ({
    setup: () => () => h('div', { class: 'p8' }, h(FlowmapNode, null, { content: () => label('vite:import-analysis') })),
  }),
}

export const Active: Story = {
  render: () => ({
    setup: () => () => h('div', { class: 'p8' }, h(FlowmapNode, { active: true, lines: { top: true, bottom: true } }, { content: () => label('resolveId') })),
  }),
}
