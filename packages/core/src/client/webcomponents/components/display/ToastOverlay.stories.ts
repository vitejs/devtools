import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h, onMounted } from 'vue'
import { addToast } from '../../state/toasts'
import { message } from '../../stories/fixtures'
import ToastOverlay from './ToastOverlay.vue'

const meta = {
  title: 'Messages/ToastOverlay',
  component: ToastOverlay,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    // Fixed bottom-right overlay — render in an iframe for the docs canvas.
    docs: {
      story: { inline: false, height: '360px' },
      description: {
        component: 'The toast stack shown bottom-right for `notify` messages. These stories push toasts on mount (with a long auto-dismiss so they stay visible).',
      },
    },
  },
} satisfies Meta<typeof ToastOverlay>

export default meta
type Story = StoryObj<typeof meta>

/** A few stacked toasts across levels. */
export const Stack: Story = {
  render: () => ({
    setup() {
      onMounted(() => {
        addToast(message({ level: 'error', message: 'Build failed', description: '2 errors in 1 file', notify: true, autoDismiss: 10 ** 7 }))
        addToast(message({ level: 'warn', message: 'Slow HMR update (820ms)', notify: true, autoDismiss: 10 ** 7 }))
        addToast(message({ level: 'success', message: 'Server ready on :5173', notify: true, autoDismiss: 10 ** 7 }))
      })
      return () => h(ToastOverlay)
    },
  }),
}
