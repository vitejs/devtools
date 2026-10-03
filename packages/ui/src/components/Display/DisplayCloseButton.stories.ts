import type { Meta, StoryObj } from '@storybook/vue3-vite'
import DisplayCloseButton from './DisplayCloseButton.vue'

const meta = {
  title: 'Display/DisplayCloseButton',
  component: DisplayCloseButton,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: 'The round close (×) button used to dismiss detail panels and overlays.' } },
  },
} satisfies Meta<typeof DisplayCloseButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
