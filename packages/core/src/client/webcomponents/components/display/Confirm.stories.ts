import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h, onMounted } from 'vue'
import { useConfirm } from '../../state/confirm'
import Confirm from './Confirm.vue'

const meta = {
  title: 'Display/Confirm',
  component: Confirm,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    // Fixed, full-screen modal — render in an iframe for the docs canvas.
    docs: {
      story: { inline: false, height: '360px' },
      description: {
        component: 'The confirmation dialog, driven by the `useConfirm()` template-promise. These stories trigger it on mount.',
      },
    },
  },
} satisfies Meta<typeof Confirm>

export default meta
type Story = StoryObj<typeof meta>

function confirmStory(options: { title?: string, message: string, confirmText?: string, cancelText?: string }): Story {
  return {
    render: () => ({
      setup() {
        const confirm = useConfirm()
        onMounted(() => {
          confirm(options)
        })
        return () => h(Confirm)
      },
    }),
  }
}

/** A titled destructive confirmation. */
export const Default: Story = confirmStory({
  title: 'Remove workspace?',
  message: 'This deletes the worktree and branch. This cannot be undone.',
  confirmText: 'Remove',
  cancelText: 'Cancel',
})

/** A message-only prompt (no title). */
export const MessageOnly: Story = confirmStory({
  message: 'Reload the page to apply the new settings?',
})
