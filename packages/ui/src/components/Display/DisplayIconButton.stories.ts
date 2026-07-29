import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'
import DisplayIconButton from './DisplayIconButton.vue'

const meta = {
  title: 'Display/DisplayIconButton',
  component: DisplayIconButton,
  tags: ['autodocs'],
  args: { title: 'Refresh', classIcon: 'i-ph-arrow-clockwise' },
  parameters: {
    docs: { description: { component: 'An icon-only button with an optional active state.' } },
  },
} satisfies Meta<typeof DisplayIconButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Active: Story = { args: { title: 'Pinned', classIcon: 'i-ph-push-pin-fill', active: true } }

export const Row: Story = {
  render: () => ({
    setup: () => () => h('div', { class: 'flex items-center gap-2 p6' }, [
      h(DisplayIconButton, { title: 'Search', classIcon: 'i-ph-magnifying-glass' }),
      h(DisplayIconButton, { title: 'Filter', classIcon: 'i-ph-funnel', active: true }),
      h(DisplayIconButton, { title: 'Settings', classIcon: 'i-ph-gear' }),
    ]),
  }),
}
