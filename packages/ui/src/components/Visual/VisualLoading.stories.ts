import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'
import BannerRolldownDevTools from '../Banner/BannerRolldownDevTools.vue'
import VisualLoading from './VisualLoading.vue'

const meta = {
  title: 'Visual/VisualLoading',
  component: VisualLoading,
  tags: ['autodocs'],
  args: { text: 'Loading...' },
  parameters: {
    docs: { description: { component: 'Full-height loading state with a spinner and a `#banner` slot for the host DevTools wordmark.' } },
  },
} satisfies Meta<typeof VisualLoading>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Each host injects its own banner through the `#banner` slot. */
export const WithBanner: Story = {
  render: () => ({
    setup: () => () => h(VisualLoading, { text: 'Loading session…' }, { banner: () => h(BannerRolldownDevTools) }),
  }),
}
