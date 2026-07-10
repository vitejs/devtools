import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'
import { categorizedEntries, groupedEntries, overflowEntries } from '../../stories/fixtures'
import { mountWithContext } from '../../stories/story-helpers'
import FloatingElements from '../floating/FloatingElements.vue'
import Dock from './Dock.vue'

const meta = {
  title: 'Dock/Shell/Float Bar',
  component: Dock,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    // The shell is `position: fixed` to the viewport, so it escapes the small
    // inline docs preview block — render it in an iframe of a fixed height.
    docs: {
      story: { inline: false, height: '520px' },
      description: {
        component: 'The floating dock bar (float mode). It anchors to an edge of the viewport and can be dragged around. These stories pin `inactiveTimeout: -1` so the bar stays expanded.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj

/** Default: docked to the bottom-center of the viewport. */
export const Bottom: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: categorizedEntries, panel: { position: 'bottom', left: 50, top: 100, inactiveTimeout: -1 } },
      ctx => [h(Dock, { context: ctx }), h(FloatingElements)],
    ),
  }),
}

/** Docked to the top edge. */
export const Top: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: categorizedEntries, panel: { position: 'top', left: 50, top: 0, inactiveTimeout: -1 } },
      ctx => [h(Dock, { context: ctx }), h(FloatingElements)],
    ),
  }),
}

/** Docked to the left edge — the bar rotates to vertical. */
export const Left: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: categorizedEntries, panel: { position: 'left', left: 0, top: 50, inactiveTimeout: -1 } },
      ctx => [h(Dock, { context: ctx }), h(FloatingElements)],
    ),
  }),
}

/** Docked to the right edge. */
export const Right: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: categorizedEntries, panel: { position: 'right', left: 100, top: 50, inactiveTimeout: -1 } },
      ctx => [h(Dock, { context: ctx }), h(FloatingElements)],
    ),
  }),
}

/** With collapsed groups on the bar. */
export const WithGroups: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: groupedEntries, panel: { position: 'bottom', left: 50, top: 100, inactiveTimeout: -1 } },
      ctx => [h(Dock, { context: ctx }), h(FloatingElements)],
    ),
  }),
}

/** Past capacity: an overflow button appears at the end of the bar. */
export const WithOverflow: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: overflowEntries, panel: { position: 'bottom', left: 50, top: 100, inactiveTimeout: -1 } },
      ctx => [h(Dock, { context: ctx }), h(FloatingElements)],
    ),
  }),
}

/** Collapsed to the minimized nub (`inactiveTimeout: 0`). */
export const Minimized: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: categorizedEntries, panel: { position: 'bottom', left: 50, top: 100, inactiveTimeout: 0 } },
      ctx => [h(Dock, { context: ctx }), h(FloatingElements)],
    ),
  }),
}

/** Unauthorized: the bar shows the warning affordance instead of the tools. */
export const Unauthorized: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: categorizedEntries, isTrusted: false, panel: { position: 'bottom', left: 50, top: 100, inactiveTimeout: -1 } },
      ctx => [h(Dock, { context: ctx }), h(FloatingElements)],
    ),
  }),
}
