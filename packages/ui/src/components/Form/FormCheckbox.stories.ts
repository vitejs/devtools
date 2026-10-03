import type { Meta, StoryObj } from '@storybook/vue3-vite'
import FormCheckbox from './FormCheckbox.vue'

const meta = {
  title: 'Form/FormCheckbox',
  component: FormCheckbox,
  tags: ['autodocs'],
  args: { label: 'Hide passed' },
  parameters: {
    docs: { description: { component: 'Brand-tinted checkbox bound through `v-model`, with an optional `label`.' } },
  },
} satisfies Meta<typeof FormCheckbox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Checked: Story = {
  args: { modelValue: true },
}
