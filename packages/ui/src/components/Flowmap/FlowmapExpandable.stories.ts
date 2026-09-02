import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'
import FlowmapExpandable from './FlowmapExpandable.vue'

const meta = {
  title: 'Flowmap/FlowmapExpandable',
  component: FlowmapExpandable,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: 'A flow node with an expand/collapse affordance; the `#node` slot is the header and `#container` holds the children revealed when expanded.' } },
  },
} satisfies Meta<typeof FlowmapExpandable>

export default meta
type Story = StoryObj<typeof meta>

function label(text: string) {
  return h('span', { class: 'font-mono text-sm' }, text)
}

export const Expanded: Story = {
  render: () => ({
    setup: () => () => h('div', { class: 'p8' }, h(FlowmapExpandable, { expandable: true, expanded: true }, {
      node: () => label('transform'),
      container: () => h('div', { class: 'flex flex-col gap-2' }, [label('vite:vue'), label('unocss')]),
    })),
  }),
}

export const Collapsed: Story = {
  render: () => ({
    setup: () => () => h('div', { class: 'p8' }, h(FlowmapExpandable, { expandable: true, expanded: false }, {
      node: () => label('transform'),
      container: () => label('hidden'),
    })),
  }),
}
