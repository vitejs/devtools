import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'
import DisplayFileSizeBadge from './DisplayFileSizeBadge.vue'

const meta = {
  title: 'Display/DisplayFileSizeBadge',
  component: DisplayFileSizeBadge,
  tags: ['autodocs'],
  args: { bytes: 128_000, colorize: true },
  parameters: {
    docs: { description: { component: 'A byte-size badge whose colour scales from small (neutral) to large (critical); can show a percentage of a total.' } },
  },
} satisfies Meta<typeof DisplayFileSizeBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const WithPercent: Story = { args: { bytes: 512_000, total: 2_000_000 } }

/** Colour scales with size. */
export const Scale: Story = {
  render: () => ({
    setup: () => () => h('div', { class: 'flex items-center gap-2 p6' }, [20_000, 300_000, 900_000, 5_000_000, 15_000_000].map(bytes => h(DisplayFileSizeBadge, { key: bytes, bytes }))),
  }),
}
