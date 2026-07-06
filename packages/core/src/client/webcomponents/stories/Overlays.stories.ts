import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { onMounted } from 'vue'
import Confirm from '../components/display/Confirm.vue'
import ToastOverlay from '../components/display/ToastOverlay.vue'
import { ConfirmPromise } from '../state/confirm'
import { addToast, dismissToast, useToasts } from '../state/toasts'
import { messagesFixture } from './mock/messages'
import { contextStory } from './story-utils'

/**
 * Global overlays that float above every dock surface: the toast stack
 * (bottom-right notifications derived from messages) and the confirm dialog
 * (a promise-driven modal).
 */
const meta = {
  title: 'Overlays',
  parameters: {
    docs: {
      description: {
        component:
          'Global overlays above the dock: the toast notification stack and the promise-driven confirm dialog.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj

/** A stack of toast notifications, one per severity level. */
export const Toasts: Story = contextStory({
  prepare: () => {
    // Clear any residual toasts from a previous story, then seed fresh ones.
    for (const toast of [...useToasts()]) dismissToast(toast.id)
    for (const entry of messagesFixture()) addToast(entry)
  },
  render: context => ({
    components: { ToastOverlay },
    setup: () => ({ context }),
    template: `<div class="min-h-100"><ToastOverlay :context="context" /></div>`,
  }),
}) as Story

/** The confirm dialog, opened immediately and left awaiting a choice. */
export const ConfirmDialog: Story = contextStory({
  render: () => ({
    components: { Confirm },
    setup() {
      onMounted(() => {
        // Fire-and-forget: the story just displays the dialog chrome.
        void ConfirmPromise.start({
          title: 'Delete workspace?',
          message: 'This removes the worktree and its branch. This action cannot be undone.',
          confirmText: 'Delete',
          cancelText: 'Cancel',
        })
      })
      return {}
    },
    template: `<div class="min-h-100"><Confirm /></div>`,
  }),
}) as Story
