import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'
import DisplayDuration from './DisplayDuration.vue'

const meta = {
  title: 'Display/DisplayDuration',
  component: DisplayDuration,
  tags: ['autodocs'],
  args: { duration: 42, unit: 'ms', color: true },
  argTypes: {
    unit: { control: 'inline-radio', options: ['ms', 'ns'] },
  },
  parameters: {
    docs: { description: { component: 'A humanised duration whose colour scales from fast (neutral) to slow (warning).' } },
  },
} satisfies Meta<typeof DisplayDuration>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Colour scales with magnitude when `color` is enabled. */
export const Scale: Story = {
  render: () => ({
    setup: () => () => h('div', { class: 'flex items-center gap-4 p6' }, [0.5, 12, 120, 850, 4200].map(duration => h(DisplayDuration, { key: duration, duration }))),
  }),
}
