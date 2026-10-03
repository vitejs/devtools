import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'
import OverlayModal from './OverlayModal.vue'

const meta = {
  title: 'Overlay/OverlayModal',
  component: OverlayModal,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: 'Teleported dialog with a solid `bg-base` panel over a dimmed backdrop. Backdrop click and Escape close it; the `#trigger` slot receives an `open()` callback.' } },
  },
} satisfies Meta<typeof OverlayModal>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => ({
    setup: () => () => h(OverlayModal, null, {
      trigger: ({ open }: { open: () => void }) => h('button', { class: 'btn-action', onClick: open }, 'Open modal'),
      title: () => 'Dialog title',
      default: () => h('div', 'Dialog body content.'),
    }),
  }),
}
