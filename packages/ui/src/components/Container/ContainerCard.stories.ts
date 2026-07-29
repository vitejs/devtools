import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'
import ContainerCard from './ContainerCard.vue'

const meta = {
  title: 'Container/ContainerCard',
  component: ContainerCard,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: 'Neutral card container with optional `#header` / `#footer` slots and a default body slot.' } },
  },
} satisfies Meta<typeof ContainerCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => ({
    setup: () => () => h(ContainerCard, null, { default: () => h('div', { class: 'p4' }, 'Card body') }),
  }),
}

export const WithHeader: Story = {
  render: () => ({
    setup: () => () => h(ContainerCard, null, {
      header: () => h('div', { class: 'font-medium' }, 'Header'),
      default: () => h('div', { class: 'p4' }, 'Card body'),
    }),
  }),
}
