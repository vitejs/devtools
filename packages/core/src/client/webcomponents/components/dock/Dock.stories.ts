import type { Meta, StoryObj } from '@storybook/vue3-vite'
import type { CreateMockContextOptions } from '../../stories/mock-context'
import type { DockLayout } from './dock-layout'
import { h } from 'vue'
import { categorizedEntries, groupedEntries, overflowEntries } from '../../stories/fixtures'
import { mountWithContext } from '../../stories/story-helpers'
import FloatingElements from '../floating/FloatingElements.vue'
import { DEFAULT_DOCK_LAYOUT } from './dock-layout'
import Dock from './Dock.vue'

/**
 * The story args ARE the dock layout: every field is wired to a Storybook
 * control so the bar's dimensions, capacity, spacing and snapping can be tuned
 * live from the Controls panel. Individual stories override specific fields to
 * showcase a single tunable in isolation.
 */
type LayoutArgs = DockLayout

const meta = {
  title: 'Dock/Shell/Float Bar',
  component: Dock,
  tags: ['autodocs'],
  args: { ...DEFAULT_DOCK_LAYOUT },
  argTypes: {
    barHeight: { control: { type: 'range', min: 24, max: 80, step: 1 }, description: 'Height of the bar (px).' },
    barMinWidth: { control: { type: 'range', min: 60, max: 220, step: 1 }, description: 'Minimum bar width before content (px).' },
    minimizedSize: { control: { type: 'range', min: 14, max: 40, step: 1 }, description: 'Side length of the collapsed nub (px).' },
    glowSize: { control: { type: 'range', min: 60, max: 320, step: 1 }, description: 'Diameter of the ambient glow (px).' },
    glowBlur: { control: { type: 'range', min: 0, max: 120, step: 1 }, description: 'Blur radius of the glow (px).' },
    maxVisibleItems: { control: { type: 'range', min: 1, max: 12, step: 1 }, description: 'Inline item capacity before overflow.' },
    viewportMargin: { control: { type: 'range', min: 0, max: 48, step: 1 }, description: 'Gap from the viewport edge (px).' },
    panelOverlapFactor: { control: { type: 'range', min: 0, max: 1, step: 0.05 }, description: 'Dock↔panel overlap (fraction of bar thickness). Visible with the panel open — see the Embedded stories.' },
    edgeSnapPercent: { control: { type: 'range', min: 0, max: 20, step: 1 }, description: 'Snap-to-edge zone (viewport %).' },
    centerSnapPercent: { control: { type: 'range', min: 0, max: 20, step: 1 }, description: 'Snap-to-center zone (viewport %).' },
    edgeZoneHeight: { control: { type: 'range', min: 0, max: 200, step: 1 }, description: 'Top/bottom edge-detection zone height (px).' },
  },
  parameters: {
    layout: 'fullscreen',
    // The shell is `position: fixed` to the viewport, so it escapes the small
    // inline docs preview block — render it in an iframe of a fixed height.
    docs: {
      story: { inline: false, height: '520px' },
      description: {
        component: 'The floating dock bar (float mode). It anchors to an edge of the viewport and can be dragged around. Its padding, sizing, spacing, capacity and snapping are driven by the `DockLayout` constants (`dock-layout.ts`) — every field is exposed here as a live control. These stories pin `inactiveTimeout: -1` so the bar stays expanded.',
      },
    },
  },
} satisfies Meta<LayoutArgs>

export default meta
type Story = StoryObj<LayoutArgs>

/**
 * Build a float-bar story whose layout is driven by the live story args, so the
 * Controls panel tunes the same `DockLayout` the runtime uses.
 */
function floatStory(options: CreateMockContextOptions): Story {
  return {
    render: (args: LayoutArgs) => ({
      setup: () => mountWithContext(
        options,
        ctx => [h(Dock, { context: ctx, layout: args }), h(FloatingElements)],
      ),
    }),
  }
}

/** Default: docked to the bottom-center of the viewport. */
export const Bottom: Story = floatStory(
  { entries: categorizedEntries, panel: { position: 'bottom', left: 50, top: 100, inactiveTimeout: -1 } },
)

/** Docked to the top edge. */
export const Top: Story = floatStory(
  { entries: categorizedEntries, panel: { position: 'top', left: 50, top: 0, inactiveTimeout: -1 } },
)

/** Docked to the left edge — the bar rotates to vertical. */
export const Left: Story = floatStory(
  { entries: categorizedEntries, panel: { position: 'left', left: 0, top: 50, inactiveTimeout: -1 } },
)

/** Docked to the right edge. */
export const Right: Story = floatStory(
  { entries: categorizedEntries, panel: { position: 'right', left: 100, top: 50, inactiveTimeout: -1 } },
)

/** With collapsed groups on the bar. */
export const WithGroups: Story = floatStory(
  { entries: groupedEntries, panel: { position: 'bottom', left: 50, top: 100, inactiveTimeout: -1 } },
)

/** Past capacity: an overflow button appears at the end of the bar. */
export const WithOverflow: Story = floatStory(
  { entries: overflowEntries, panel: { position: 'bottom', left: 50, top: 100, inactiveTimeout: -1 } },
)

/** Collapsed to the minimized nub (`inactiveTimeout: 0`). */
export const Minimized: Story = floatStory(
  { entries: categorizedEntries, panel: { position: 'bottom', left: 50, top: 100, inactiveTimeout: 0 } },
)

/** Unauthorized: the bar shows the warning affordance instead of the tools. */
export const Unauthorized: Story = {
  ...floatStory({ entries: categorizedEntries, isTrusted: false, panel: { position: 'bottom', left: 50, top: 100, inactiveTimeout: -1 } }),
}

// --- Layout tunables ---------------------------------------------------------
// Each of the following overrides a single `DockLayout` field to demonstrate
// how the bar responds. Adjust the Controls panel to combine them.

/** `barHeight: 56` — a taller bar (also grows the panel-to-dock offset). */
export const TallBar: Story = {
  ...floatStory({ entries: categorizedEntries, panel: { position: 'bottom', left: 50, top: 100, inactiveTimeout: -1 } }),
  args: { barHeight: 56 },
}

/** `barHeight: 30`, `minimizedSize: 18` — a compact bar. */
export const CompactBar: Story = {
  ...floatStory({ entries: categorizedEntries, panel: { position: 'bottom', left: 50, top: 100, inactiveTimeout: -1 } }),
  args: { barHeight: 30, minimizedSize: 18 },
}

/** `viewportMargin: 28` — a roomy gap between the bar and the viewport edge. */
export const RoomyViewportMargin: Story = {
  ...floatStory({ entries: categorizedEntries, panel: { position: 'bottom', left: 50, top: 100, inactiveTimeout: -1 } }),
  args: { viewportMargin: 28 },
}

/** `maxVisibleItems: 3` — a lower capacity forces more entries into overflow. */
export const LowerCapacity: Story = {
  ...floatStory({ entries: overflowEntries, panel: { position: 'bottom', left: 50, top: 100, inactiveTimeout: -1 } }),
  args: { maxVisibleItems: 3 },
}

/** `maxVisibleItems: 9` — a higher capacity absorbs the overflow set inline. */
export const HigherCapacity: Story = {
  ...floatStory({ entries: overflowEntries, panel: { position: 'bottom', left: 50, top: 100, inactiveTimeout: -1 } }),
  args: { maxVisibleItems: 9 },
}

/** `glowSize: 280`, `glowBlur: 90` — a larger, softer ambient glow. */
export const LargeGlow: Story = {
  ...floatStory({ entries: categorizedEntries, panel: { position: 'bottom', left: 50, top: 100, inactiveTimeout: -1 } }),
  args: { glowSize: 280, glowBlur: 90 },
}
