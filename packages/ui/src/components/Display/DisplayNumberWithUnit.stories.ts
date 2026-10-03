import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'
import DisplayNumberWithUnit from './DisplayNumberWithUnit.vue'

const meta = {
  title: 'Display/DisplayNumberWithUnit',
  component: DisplayNumberWithUnit,
  tags: ['autodocs'],
  args: { number: 128, unit: 'ms' },
  parameters: {
    docs: { description: { component: 'A number rendered with a small trailing unit label.' } },
  },
} satisfies Meta<typeof DisplayNumberWithUnit>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Units: Story = {
  render: () => ({
    setup: () => () => h('div', { class: 'flex items-center gap-4 p6' }, [
      h(DisplayNumberWithUnit, { number: 128, unit: 'ms' }),
      h(DisplayNumberWithUnit, { number: 42, unit: 'kb' }),
      h(DisplayNumberWithUnit, { number: 7, unit: 'modules' }),
    ]),
  }),
}
