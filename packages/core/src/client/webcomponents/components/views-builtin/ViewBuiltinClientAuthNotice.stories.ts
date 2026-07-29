import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'
import { mountWithContext } from '../../stories/story-helpers'
import ViewBuiltinClientAuthNotice from './ViewBuiltinClientAuthNotice.vue'

const meta = {
  title: 'Views/Builtin/AuthNotice',
  component: ViewBuiltinClientAuthNotice,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'The authorization prompt shown when the client is not yet trusted — explains the risk and takes a one-time code.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj

export const Default: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { isTrusted: false },
      ctx => h('div', { class: 'h-140 bg-base color-base border border-base rounded-lg overflow-auto' }, h(ViewBuiltinClientAuthNotice, { context: ctx })),
    ),
  }),
}
