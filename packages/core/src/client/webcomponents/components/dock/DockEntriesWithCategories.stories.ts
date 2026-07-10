import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'
import { categorizedEntries, groupedEntries } from '../../stories/fixtures'
import { mountWithContext, stage } from '../../stories/story-helpers'
import DockEntriesWithCategories from './DockEntriesWithCategories.vue'

/** Horizontal dock-bar pill wrapper. */
function bar(children: any, vertical = false) {
  return h('div', {
    class: [
      'flex items-center gap-0.5 p1.5 rounded-full bg-glass border border-base shadow color-base',
      vertical ? 'flex-col' : 'flex-row',
    ],
  }, children)
}

const meta = {
  title: 'Dock/Bar/EntriesWithCategories',
  component: DockEntriesWithCategories,
  tags: ['autodocs'],
} satisfies Meta

export default meta
type Story = StoryObj

/**
 * Entries spanning several categories. Categories are ordered by the built-in
 * ranking and separated by a divider.
 */
export const Categories: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: categorizedEntries },
      ctx => stage(bar(h(DockEntriesWithCategories, {
        context: ctx,
        groups: ctx.docks.groupedEntries,
        selected: ctx.docks.selected,
        isVertical: false,
        onSelect: (e: any) => ctx.docks.switchEntry(e?.id),
      }))),
    ),
  }),
}

/**
 * A bar with collapsed groups — the group members fold behind their group
 * button and only the group icon shows on the bar.
 */
export const WithGroups: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: groupedEntries },
      ctx => stage(bar(h(DockEntriesWithCategories, {
        context: ctx,
        groups: ctx.docks.groupedEntries,
        selected: ctx.docks.selected,
        isVertical: false,
        onSelect: (e: any) => ctx.docks.switchEntry(e?.id),
      }))),
    ),
  }),
}

/** The same bar rotated for a left/right edge dock. */
export const Vertical: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: categorizedEntries },
      ctx => stage(bar(h(DockEntriesWithCategories, {
        context: ctx,
        groups: ctx.docks.groupedEntries,
        selected: ctx.docks.selected,
        isVertical: true,
      }), true)),
    ),
  }),
}
