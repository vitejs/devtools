import type { Meta, StoryObj } from '@storybook/vue3-vite'
import type { DevToolsViewGroup } from '@vitejs/devtools-kit'
import { h } from 'vue'
import { groupedEntries } from '../../stories/fixtures'
import { mountWithContext, stage } from '../../stories/story-helpers'
import FloatingElements from '../floating/FloatingElements.vue'
import DockGroupButton from './DockGroupButton.vue'

const nuxtGroup = groupedEntries.find(e => e.id === 'nuxt') as DevToolsViewGroup
const playgroundGroup = groupedEntries.find(e => e.id === 'playground') as DevToolsViewGroup

function bar(children: any) {
  return h('div', { class: 'flex items-center gap-0.5 p1.5 rounded-full bg-glass border border-base shadow color-base' }, children)
}

const meta = {
  title: 'Dock/Group/Button',
  component: DockGroupButton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'The dock-bar button representing a group. Click behaviour depends on the group: a group with `defaultChildId` opens that member directly, otherwise it reveals a popover of members. `FloatingElements` is mounted alongside so the popover renders.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj

/**
 * A popover-only group (no `defaultChildId`): clicking reveals the member
 * popover.
 */
export const PopoverOnly: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: groupedEntries },
      ctx => stage([
        bar(h(DockGroupButton, {
          context: ctx,
          group: playgroundGroup,
          isVertical: false,
          selected: ctx.docks.selected,
          onSelect: (e: any) => ctx.docks.switchEntry(e?.id),
        })),
        h(FloatingElements),
      ]),
    ),
  }),
}

/**
 * A group with a `defaultChildId`: clicking opens that member straight away
 * instead of showing the popover.
 */
export const WithDefaultChild: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: groupedEntries },
      ctx => stage([
        bar(h(DockGroupButton, {
          context: ctx,
          group: nuxtGroup,
          isVertical: false,
          selected: ctx.docks.selected,
          onSelect: (e: any) => ctx.docks.switchEntry(e?.id),
        })),
        h(FloatingElements),
      ]),
    ),
  }),
}

/** Active state — a member of the group currently owns the panel. */
export const Active: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: groupedEntries, selectedId: 'nuxt:pages' },
      ctx => stage([
        bar(h(DockGroupButton, {
          context: ctx,
          group: nuxtGroup,
          isVertical: false,
          selected: ctx.docks.selected,
          onSelect: (e: any) => ctx.docks.switchEntry(e?.id),
        })),
        h(FloatingElements),
      ]),
    ),
  }),
}
