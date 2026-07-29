import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ActionIconButton from './ActionIconButton.vue'

const meta = {
  title: 'Action/ActionIconButton',
  component: ActionIconButton,
  tags: ['autodocs'],
  args: { icon: 'i-ph-list-bullets-duotone', tooltip: 'Session list' },
  parameters: {
    docs: { description: { component: 'Round icon-only button with a floating-vue `tooltip`, `active` state, `compact` variant, and a `#badge` slot. Font-size drives its size.' } },
  },
} satisfies Meta<typeof ActionIconButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Active: Story = {
  args: { active: true },
}

export const Compact: Story = {
  args: { compact: true },
}
