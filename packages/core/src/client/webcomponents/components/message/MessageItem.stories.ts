import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'
import { message, sampleMessages } from '../../stories/fixtures'
import MessageItem from './MessageItem.vue'

const meta = {
  title: 'Messages/MessageItem',
  component: MessageItem,
  tags: ['autodocs'],
  decorators: [() => ({ template: '<div class="max-w-120 p6 font-sans color-base"><story /></div>' })],
  parameters: {
    docs: {
      description: {
        component: 'A single log/message row: level accent, icon, title, description, relative time and category/label chips.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj

export const Error: Story = {
  render: () => ({ setup: () => () => h(MessageItem, { entry: sampleMessages[0]! }) }),
}

export const Loading: Story = {
  render: () => ({ setup: () => () => h(MessageItem, { entry: message({ level: 'warn', message: 'Running checks…', status: 'loading', category: 'a11y' }) }) }),
}

/** The compact variant used inside toasts (no timestamp / chips). */
export const Compact: Story = {
  render: () => ({ setup: () => () => h(MessageItem, { entry: sampleMessages[2]!, compact: true }) }),
}

/** Every level stacked together. */
export const AllLevels: Story = {
  render: () => ({
    setup: () => () => h('div', { class: 'flex flex-col gap-3' }, sampleMessages.map(entry => h(MessageItem, { key: entry.id, entry }))),
  }),
}
