import type { Meta, StoryObj } from '@storybook/vue3-vite'
import type { DevToolsViewGroup } from '@vitejs/devtools-kit'
import { h } from 'vue'
import { groupedEntries } from '../../stories/fixtures'
import { mountWithContext, stage } from '../../stories/story-helpers'
import DockGroupSidebar from './DockGroupSidebar.vue'

const nuxtGroup = groupedEntries.find(e => e.id === 'nuxt') as DevToolsViewGroup

/** A bordered, tall shell that mimics the panel the sidebar lives inside. */
function shell(children: any) {
  return h('div', { class: 'flex h-80 bg-glass color-base border border-base rounded-lg shadow overflow-hidden font-sans' }, [
    children,
    h('div', { class: 'flex-1 flex items-center justify-center op40 text-sm' }, 'panel body'),
  ])
}

const meta = {
  title: 'Dock/Group/Sidebar',
  component: DockGroupSidebar,
  tags: ['autodocs'],
} satisfies Meta

export default meta
type Story = StoryObj

/**
 * The group rail shown down the side of a panel when the active entry belongs
 * to a group — the group anchor on top, its members below.
 */
export const Default: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: groupedEntries, selectedId: 'nuxt:overview' },
      ctx => stage(shell(h(DockGroupSidebar, {
        context: ctx,
        group: nuxtGroup,
        selectedId: ctx.docks.selectedId,
      }))),
    ),
  }),
}

/** A different member active — the highlight follows the selection. */
export const WithSelection: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: groupedEntries, selectedId: 'nuxt:components' },
      ctx => stage(shell(h(DockGroupSidebar, {
        context: ctx,
        group: nuxtGroup,
        selectedId: ctx.docks.selectedId,
      }))),
    ),
  }),
}
