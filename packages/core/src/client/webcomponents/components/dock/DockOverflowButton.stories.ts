import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'
import { docksSplitGroupsWithCapacity } from '../../state/dock-settings'
import { overflowEntries } from '../../stories/fixtures'
import { mountWithContext, stage } from '../../stories/story-helpers'
import FloatingElements from '../floating/FloatingElements.vue'
import DockOverflowButton from './DockOverflowButton.vue'

function bar(children: any) {
  return h('div', { class: 'flex items-center gap-0.5 p1.5 rounded-full bg-glass border border-base shadow color-base' }, children)
}

const meta = {
  title: 'Dock/Bar/OverflowButton',
  component: DockOverflowButton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Shown when the bar exceeds its slot capacity. Carries a badge with the hidden count and reveals the remaining entries in a popover on click.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj

/** Enough entries to overflow the 5-slot capacity; the remainder go behind the button. */
export const Default: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: overflowEntries },
      (ctx) => {
        const overflow = docksSplitGroupsWithCapacity(ctx.docks.groupedEntries, 5).overflow
        return stage([
          bar(h(DockOverflowButton, {
            context: ctx,
            isVertical: false,
            groups: overflow,
            selected: ctx.docks.selected,
            onSelect: (e: any) => ctx.docks.switchEntry(e?.id),
          })),
          h(FloatingElements),
        ])
      },
    ),
  }),
}
