import type { Meta, StoryObj } from '@storybook/vue3-vite'
import DisplayTimestamp from './DisplayTimestamp.vue'

const meta = {
  title: 'Display/DisplayTimestamp',
  component: DisplayTimestamp,
  tags: ['autodocs'],
  args: { timestamp: Date.now() },
  parameters: {
    docs: { description: { component: 'Renders an epoch timestamp as a human-readable local date/time.' } },
  },
} satisfies Meta<typeof DisplayTimestamp>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
