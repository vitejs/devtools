import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'
import ActionButton from './ActionButton.vue'

const meta = {
  title: 'Action/ActionButton',
  component: ActionButton,
  tags: ['autodocs'],
  args: { variant: 'action' },
  parameters: {
    docs: { description: { component: 'Polymorphic action button (`variant` action/primary/text, `size`, `icon`, `loading`, `href`/`to`/`as`).' } },
  },
} satisfies Meta<typeof ActionButton>

export default meta
type Story = StoryObj<typeof meta>

export const Action: Story = {
  render: args => ({ setup: () => () => h(ActionButton, args, { default: () => 'Run build' }) }),
}

export const Primary: Story = {
  args: { variant: 'primary', icon: 'i-ph-play-duotone' },
  render: args => ({ setup: () => () => h(ActionButton, args, { default: () => 'Run build' }) }),
}

export const Text: Story = {
  args: { variant: 'text', icon: 'i-ph-arrow-right-duotone' },
  render: args => ({ setup: () => () => h(ActionButton, args, { default: () => 'Learn more' }) }),
}

export const Loading: Story = {
  args: { variant: 'primary', loading: true },
  render: args => ({ setup: () => () => h(ActionButton, args, { default: () => 'Building…' }) }),
}
