import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'
import DisplayNumberBadge from './DisplayNumberBadge.vue'

const meta = {
  title: 'Display/DisplayNumberBadge',
  component: DisplayNumberBadge,
  tags: ['autodocs'],
  args: { number: 1234 },
  argTypes: {
    format: { control: 'inline-radio', options: ['locale', 'percent'] },
  },
  parameters: {
    docs: {
      description: {
        component: 'A compact numeric badge with locale or percent formatting and optional icon/prefix/suffix.',
      },
    },
  },
} satisfies Meta<typeof DisplayNumberBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Locale: Story = { args: { number: 1234567 } }
export const Percent: Story = { args: { number: 0.4213, format: 'percent' } }
export const WithIcon: Story = { args: { number: 42, icon: 'i-ph-package-duotone', prefix: 'modules' } }

export const Row: Story = {
  render: () => ({
    setup: () => () => h('div', { class: 'flex items-center gap-2 p6' }, [
      h(DisplayNumberBadge, { number: 128 }),
      h(DisplayNumberBadge, { number: 0.75, format: 'percent' }),
      h(DisplayNumberBadge, { number: 9, suffix: 'plugins' }),
    ]),
  }),
}
