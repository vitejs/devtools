import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'
import { basicEntries, iframe } from '../../stories/fixtures'
import { mountWithContext, stage } from '../../stories/story-helpers'
import DockEntry from './DockEntry.vue'

const sample = iframe('overview', 'Overview', 'ph:gauge-duotone')

interface EntryArgs {
  isSelected?: boolean
  isDimmed?: boolean
  isVertical?: boolean
  isAction?: boolean
  badge?: string
  tooltip?: boolean
}

/** A pill container that echoes the dock bar, so the button reads in context. */
function pill(children: any) {
  return h('div', { class: 'flex items-center gap-1 p1.5 rounded-full bg-glass border border-base shadow' }, children)
}

const meta = {
  title: 'Dock/Entry',
  component: DockEntry,
  tags: ['autodocs'],
  args: {
    isSelected: false,
    isDimmed: false,
    isVertical: false,
    isAction: false,
    badge: '',
    tooltip: true,
  },
  render: (args: EntryArgs) => ({
    setup: () => mountWithContext(
      { entries: basicEntries },
      ctx => stage(pill(h(DockEntry, {
        context: ctx,
        dock: sample,
        isSelected: args.isSelected,
        isDimmed: args.isDimmed,
        isVertical: args.isVertical,
        isAction: args.isAction,
        badge: args.badge || undefined,
        tooltip: args.tooltip,
      }))),
    ),
  }),
} satisfies Meta<EntryArgs>

export default meta
type Story = StoryObj<EntryArgs>

/** Idle button — the resting state on the dock bar. */
export const Default: Story = {}

/** The active entry: scaled up and tinted while its panel owns the screen. */
export const Selected: Story = { args: { isSelected: true } }

/** Dimmed and desaturated because a sibling entry is the active one. */
export const Dimmed: Story = { args: { isDimmed: true } }

/** Action entries (one-shot commands) get a circular, filled treatment. */
export const Action: Story = { args: { isAction: true } }

/** A count badge in the corner (e.g. pending items). */
export const WithBadge: Story = { args: { badge: '3' } }

/** Rotated for a left/right edge dock. */
export const Vertical: Story = { args: { isVertical: true } }

/** Every state laid out together for a quick visual diff. */
export const States: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: basicEntries },
      ctx => stage(pill([
        h(DockEntry, { context: ctx, dock: sample }),
        h(DockEntry, { context: ctx, dock: sample, isSelected: true }),
        h(DockEntry, { context: ctx, dock: sample, isDimmed: true }),
        h(DockEntry, { context: ctx, dock: sample, isAction: true }),
        h(DockEntry, { context: ctx, dock: sample, badge: '9+' }),
      ])),
    ),
  }),
}
