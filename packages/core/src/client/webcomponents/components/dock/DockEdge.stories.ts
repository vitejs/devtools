import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'
import { categorizedEntries, groupedEntries } from '../../stories/fixtures'
import { mountWithContext } from '../../stories/story-helpers'
import FloatingElements from '../floating/FloatingElements.vue'
import DockEdge from './DockEdge.vue'

/** A stand-in panel body (the real one mounts iframe/custom views). */
function body(entry: any) {
  return h('div', { class: 'w-full h-full p6 font-sans color-base of-auto' }, [
    h('div', { class: 'text-lg font-medium mb2' }, entry?.title ?? 'No selection'),
    h('div', { class: 'op60 text-sm' }, `Panel content for "${entry?.id ?? '—'}"`),
  ])
}

const meta = {
  title: 'Dock/Shell/Edge Panel',
  component: DockEdge,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false, height: '520px' },
      description: {
        component: 'The edge-docked shell (edge mode): a toolbar pinned to one viewport edge with a resizable panel. The `#view` slot is stubbed here in place of the live view renderer.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj

function edgeStory(position: 'top' | 'right' | 'bottom' | 'left', open = true) {
  return {
    render: () => ({
      setup: () => mountWithContext(
        {
          entries: categorizedEntries,
          selectedId: open ? 'overview' : null,
          panel: { mode: 'edge', position, open, height: 40, width: 30 },
        },
        ctx => [
          h(DockEdge, { context: ctx }, { view: ({ entry }: any) => body(entry) }),
          h(FloatingElements),
        ],
      ),
    }),
  } satisfies Story
}

/** Bottom edge with the panel open. */
export const Bottom: Story = edgeStory('bottom')

/** Top edge. */
export const Top: Story = edgeStory('top')

/** Left edge — toolbar runs vertically. */
export const Left: Story = edgeStory('left')

/** Right edge. */
export const Right: Story = edgeStory('right')

/** Toolbar only — nothing selected, so the panel body is collapsed away. */
export const ToolbarOnly: Story = edgeStory('bottom', false)

/** Edge dock hosting a group — the group rail shows inside the panel. */
export const WithGroup: Story = {
  render: () => ({
    setup: () => mountWithContext(
      {
        entries: groupedEntries,
        selectedId: 'nuxt:overview',
        panel: { mode: 'edge', position: 'bottom', open: true, height: 45 },
      },
      ctx => [
        h(DockEdge, { context: ctx }, { view: ({ entry }: any) => body(entry) }),
        h(FloatingElements),
      ],
    ),
  }),
}
