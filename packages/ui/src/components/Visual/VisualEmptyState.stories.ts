import type { Meta, StoryObj } from '@storybook/vue3-vite'
import VisualEmptyState from './VisualEmptyState.vue'

const meta = {
  title: 'Visual/VisualEmptyState',
  component: VisualEmptyState,
  tags: ['autodocs'],
  args: {
    icon: 'i-ph-folder-simple-duotone',
    title: 'No sessions found',
    description: 'Run the linter to generate a report.',
  },
  parameters: {
    docs: { description: { component: 'Centered empty-state placeholder with an icon, title, and description.' } },
  },
} satisfies Meta<typeof VisualEmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
