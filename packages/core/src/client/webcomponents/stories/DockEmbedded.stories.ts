import type { Meta, StoryObj } from '@storybook/vue3-vite'
import DockEmbedded from '../components/dock/DockEmbedded.vue'
import { contextStory } from './story-utils'

/**
 * The embedded dock is what a user's app renders in-page: a floating panel
 * (or an edge-docked panel) overlaid on top of the host application.
 */
const meta = {
  title: 'Docks/Embedded',
  component: DockEmbedded,
  parameters: {
    docs: {
      description: {
        component:
          'The in-page DevTools dock, overlaid on the host app. Supports a floating panel and an edge-docked panel; the dock bar is always present.',
      },
    },
  },
} satisfies Meta<typeof DockEmbedded>

export default meta
type Story = StoryObj<typeof meta>

function renderEmbedded(context: any) {
  return {
    components: { DockEmbedded },
    setup: () => ({ context }),
    template: `<DockEmbedded :context="context" />`,
  }
}

/** Floating panel open at the bottom of the viewport, showing an iframe frame. */
export const FloatOpen: Story = contextStory({
  context: {
    clientType: 'embedded',
    panel: { mode: 'float', open: true, position: 'bottom', width: 60, height: 60 },
    selectedId: 'overview',
  },
  render: renderEmbedded,
}) as Story

/** Floating panel docked to the left edge. */
export const FloatLeft: Story = contextStory({
  context: {
    clientType: 'embedded',
    panel: { mode: 'float', open: true, position: 'left', width: 40, height: 80, left: 0, top: 10 },
    selectedId: 'modules',
  },
  render: renderEmbedded,
}) as Story

/** Edge mode: the panel is pinned to the viewport edge rather than floating. */
export const EdgeOpen: Story = contextStory({
  context: {
    clientType: 'embedded',
    panel: { mode: 'edge', open: true, position: 'bottom', width: 60, height: 50 },
    selectedId: 'overview',
  },
  render: renderEmbedded,
}) as Story

/** Only the dock bar is visible — no entry selected, panel closed. */
export const DockBarOnly: Story = contextStory({
  context: {
    clientType: 'embedded',
    panel: { mode: 'float', open: false, position: 'bottom' },
    selectedId: null,
  },
  render: renderEmbedded,
}) as Story

/** A grouped entry selected: the group's members appear in a sidebar. */
export const GroupedEntry: Story = contextStory({
  context: {
    clientType: 'embedded',
    panel: { mode: 'float', open: true, position: 'bottom', width: 70, height: 60 },
    selectedId: 'nuxt:overview',
  },
  render: renderEmbedded,
}) as Story
