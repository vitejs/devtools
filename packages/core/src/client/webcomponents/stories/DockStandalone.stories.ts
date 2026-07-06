import type { Meta, StoryObj } from '@storybook/vue3-vite'
import DockStandalone from '../components/dock/DockStandalone.vue'
import { contextStory } from './story-utils'

/**
 * The standalone dock is the full-page DevTools UI — the sidebar navigation
 * plus the active view — served on its own route rather than overlaid on a
 * host app. This is the "static" rendering mode used by the standalone client
 * and the picture-in-picture popup.
 */
const meta = {
  title: 'Docks/Standalone',
  component: DockStandalone,
  parameters: {
    docs: {
      description: {
        component:
          'Full-page DevTools UI: fixed sidebar navigation on the left, the active dock view filling the rest. Used by the standalone client and PiP popup.',
      },
    },
  },
} satisfies Meta<typeof DockStandalone>

export default meta
type Story = StoryObj<typeof meta>

function renderStandalone(context: any) {
  return {
    components: { DockStandalone },
    setup: () => ({ context }),
    template: `<DockStandalone :context="context" />`,
  }
}

/** The default full-page layout with the first entry auto-selected. */
export const Default: Story = contextStory({
  context: { clientType: 'standalone', selectedId: 'overview' },
  render: renderStandalone,
}) as Story

/** A grouped member selected — the group's siblings render in the sub-sidebar. */
export const GroupedEntry: Story = contextStory({
  context: { clientType: 'standalone', selectedId: 'nuxt:pages' },
  render: renderStandalone,
}) as Story

/**
 * When the RPC client is not trusted, the standalone page shows the client-auth
 * notice instead of the dock, prompting the user to authorize the connection.
 */
export const Untrusted: Story = contextStory({
  context: { clientType: 'standalone', isTrusted: false },
  render: renderStandalone,
}) as Story
