import type { Meta, StoryObj } from '@storybook/vue3-vite'
import type { DevToolsViewGroup } from '@vitejs/devtools-kit'
import { DEFAULT_STATE_USER_SETTINGS } from '@vitejs/devtools-kit/constants'
import { h } from 'vue'
import { getGroupMembersGrouped } from '../../state/dock-settings'
import { group, groupedEntries, subcategorizedGroupEntries, toolsGroup } from '../../stories/fixtures'
import { mountWithContext, stage } from '../../stories/story-helpers'
import DockGroupPopover from './DockGroupPopover.vue'

const settings = DEFAULT_STATE_USER_SETTINGS()
const nuxtGroup = groupedEntries.find(e => e.id === 'nuxt') as DevToolsViewGroup
// Members split by in-group sub-category (the shape the popover renders).
const nuxtMembers = getGroupMembersGrouped(groupedEntries, 'nuxt', settings)
const toolsMembers = getGroupMembersGrouped(subcategorizedGroupEntries, 'tools', settings)

/** A framed surface that stands in for the floating popover container. */
function popover(children: any) {
  return h('div', { class: 'bg-glass color-base border border-base rounded-lg shadow p1 font-sans' }, children)
}

const meta = {
  title: 'Dock/Group/Popover',
  component: DockGroupPopover,
  tags: ['autodocs'],
} satisfies Meta

export default meta
type Story = StoryObj

/** The group's members listed under its heading; click to select one. */
export const Default: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: groupedEntries },
      ctx => stage(popover(h(DockGroupPopover, {
        context: ctx,
        group: nuxtGroup,
        members: nuxtMembers,
        selectedId: ctx.docks.selectedId,
        onSelect: (entry: any) => ctx.docks.switchEntry(entry.id),
      }))),
    ),
  }),
}

/** With one member already active — it gets the tinted, highlighted row. */
export const WithSelection: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: groupedEntries, selectedId: 'nuxt:pages' },
      ctx => stage(popover(h(DockGroupPopover, {
        context: ctx,
        group: nuxtGroup,
        members: nuxtMembers,
        selectedId: ctx.docks.selectedId,
        onSelect: (entry: any) => ctx.docks.switchEntry(entry.id),
      }))),
    ),
  }),
}

/** A member carrying a count badge. */
export const WithBadge: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: groupedEntries },
      ctx => stage(popover(h(DockGroupPopover, {
        context: ctx,
        group: nuxtGroup,
        members: nuxtMembers,
        selectedId: 'nuxt:components',
        onSelect: (entry: any) => ctx.docks.switchEntry(entry.id),
      }))),
    ),
  }),
}

/** Members split across in-group sub-categories, shown with section dividers. */
export const WithSubcategories: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: subcategorizedGroupEntries },
      ctx => stage(popover(h(DockGroupPopover, {
        context: ctx,
        group: toolsGroup,
        members: toolsMembers,
        selectedId: ctx.docks.selectedId,
        onSelect: (entry: any) => ctx.docks.switchEntry(entry.id),
      }))),
    ),
  }),
}

/** An empty group falls back to the "No tools yet" placeholder. */
export const Empty: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: [group('empty', 'Empty', 'ph:folder-dashed-duotone')] },
      ctx => stage(popover(h(DockGroupPopover, {
        context: ctx,
        group: group('empty', 'Empty', 'ph:folder-dashed-duotone') as DevToolsViewGroup,
        members: [],
        selectedId: null,
      }))),
    ),
  }),
}
