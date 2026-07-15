import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'
import { categorizedEntries, groupedEntries } from '../../stories/fixtures'
import { mountWithContext } from '../../stories/story-helpers'
import DockPanel from './DockPanel.vue'

const MARGINS = { left: 2, top: 2, right: 2, bottom: 2 }

function body(entry: any) {
  return h('div', { class: 'w-full h-full p6 font-sans color-base of-auto' }, [
    h('div', { class: 'text-lg font-medium mb2' }, entry?.title ?? 'No selection'),
    h('div', { class: 'op60 text-sm' }, `Panel content for "${entry?.id ?? '—'}"`),
  ])
}

const meta = {
  title: 'Dock/Shell/Float Panel',
  component: DockPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false, height: '540px' },
      description: {
        component: 'The floating panel shown above the dock bar in float mode. The `#view` slot is stubbed here in place of the live view renderer.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj

/** A plain entry selected, panel anchored to the bottom. */
export const Default: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: categorizedEntries, selectedId: 'overview', panel: { position: 'bottom', width: 60, height: 60 } },
      ctx => h(DockPanel, {
        context: ctx,
        selected: ctx.docks.selected,
        panelMargins: MARGINS,
      }, { view: ({ entry }: any) => body(entry) }),
    ),
  }),
}

/** A group member selected — the group rail appears down the left of the panel. */
export const WithGroupSidebar: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: groupedEntries, selectedId: 'nuxt:overview', panel: { position: 'bottom', width: 60, height: 60 } },
      ctx => h(DockPanel, {
        context: ctx,
        selected: ctx.docks.selected,
        panelMargins: MARGINS,
      }, { view: ({ entry }: any) => body(entry) }),
    ),
  }),
}

/** Anchored to the right edge. */
export const RightAnchored: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: categorizedEntries, selectedId: 'overview', panel: { position: 'right', width: 40, height: 80 } },
      ctx => h(DockPanel, {
        context: ctx,
        selected: ctx.docks.selected,
        panelMargins: MARGINS,
      }, { view: ({ entry }: any) => body(entry) }),
    ),
  }),
}
