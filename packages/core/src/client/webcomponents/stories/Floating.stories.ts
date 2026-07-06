import type { Meta, StoryObj } from '@storybook/vue3-vite'
import type { FloatingPopoverProps } from '../state/floating-tooltip'
import { h, onMounted, ref } from 'vue'
import FloatingElements from '../components/floating/FloatingElements.vue'
import {
  setDockContextMenu,
  setDocksGroupPanel,
  setDocksOverflowPanel,
  setEdgePositionDropdown,
  setFloatingTooltip,
} from '../state/floating-tooltip'
import { resetFloatingState } from './story-utils'

/**
 * Floating popovers are the transient overlays anchored to dock elements:
 * hover tooltips, the dock-bar overflow panel, group popovers, the entry
 * context menu, and the edge-position dropdown. `FloatingElements` hosts them
 * all, driven by the shared floating-state singletons.
 */
const meta = {
  title: 'Floating/Popovers',
  component: FloatingElements,
  parameters: {
    docs: {
      description: {
        component:
          'Transient overlays anchored to dock elements — tooltips, overflow/group popovers, the entry context menu, and the edge-position dropdown.',
      },
    },
  },
} satisfies Meta<typeof FloatingElements>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Render a labelled anchor button centered in the viewport, plus the
 * `FloatingElements` host. Once mounted, `open(anchor)` seeds the relevant
 * floating-state singleton so its popover appears next to the anchor.
 */
function anchoredPopover(
  label: string,
  open: (props: FloatingPopoverProps) => void,
  content: FloatingPopoverProps['content'],
) {
  return () => {
    const anchor = ref<HTMLElement | null>(null)
    onMounted(() => {
      resetFloatingState()
      if (anchor.value)
        open({ el: anchor.value, content })
    })
    return {
      components: { FloatingElements },
      setup: () => ({ anchor }),
      template: `
        <div class="grid place-items-center min-h-100">
          <button ref="anchor" class="px3 py2 rounded border border-base bg-secondary color-base text-sm">${label}</button>
          <FloatingElements />
        </div>
      `,
    }
  }
}

function menu(items: [icon: string, label: string][]) {
  return () =>
    h(
      'div',
      { class: 'flex flex-col gap-1 min-w-40' },
      items.map(([icon, text]) =>
        h('div', { class: 'flex items-center gap-2 px2 py1 rounded hover:bg-active cursor-pointer text-sm' }, [
          h('div', { class: `${icon} op70` }),
          h('span', text),
        ])),
    )
}

/** A hover tooltip anchored below its target. */
export const Tooltip: Story = {
  render: anchoredPopover('Hover target', setFloatingTooltip, 'Open in editor'),
}

/** The overflow panel that collects dock entries that don't fit on the bar. */
export const OverflowPanel: Story = {
  render: anchoredPopover(
    'Overflow',
    setDocksOverflowPanel,
    menu([
      ['i-ph-gauge-duotone', 'Overview'],
      ['i-ph-plugs-connected-duotone', 'Modules'],
      ['i-ph-newspaper-clipping-duotone', 'Notes'],
    ]),
  ),
}

/** A group popover listing a collapsed group's member entries. */
export const GroupPanel: Story = {
  render: anchoredPopover(
    'Nuxt group',
    setDocksGroupPanel,
    menu([
      ['i-ph-gauge-duotone', 'Overview'],
      ['i-ph-files-duotone', 'Pages'],
      ['i-ph-puzzle-piece-duotone', 'Components'],
    ]),
  ),
}

/** The context menu shown when right-clicking a dock entry. */
export const ContextMenu: Story = {
  render: anchoredPopover(
    'Right-click target',
    setDockContextMenu,
    menu([
      ['i-ph-arrow-square-out-duotone', 'Open in popup'],
      ['i-ph-eye-slash-duotone', 'Hide entry'],
      ['i-ph-gear-duotone', 'Settings'],
    ]),
  ),
}

/** The dropdown for choosing which viewport edge the dock pins to. */
export const EdgePositionDropdown: Story = {
  render: anchoredPopover(
    'Edge position',
    setEdgePositionDropdown,
    menu([
      ['i-ph-square-half-bottom-duotone', 'Bottom'],
      ['i-ph-square-half-duotone', 'Left'],
      ['i-ph-square-half-duotone', 'Right'],
    ]),
  ),
}
