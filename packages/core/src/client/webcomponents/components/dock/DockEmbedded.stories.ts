import type { Meta, StoryObj } from '@storybook/vue3-vite'
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import { h } from 'vue'
import { categorizedEntries } from '../../stories/fixtures'
import { mountWithContext } from '../../stories/story-helpers'
import DockEmbedded from './DockEmbedded.vue'

// Entries whose iframes load `about:blank`, so the full shell (address bar +
// iframe pane) renders without reaching for a dev server.
const blankEntries: DevToolsDockEntry[] = [
  { id: 'overview', type: 'iframe', url: 'about:blank', title: 'Overview', icon: 'ph:gauge-duotone' },
  { id: 'inspect', type: 'iframe', url: 'about:blank', title: 'Inspect', icon: 'ph:stethoscope-duotone' },
  { id: 'assets', type: 'iframe', url: 'about:blank', title: 'Assets', icon: 'ph:images-duotone' },
] as DevToolsDockEntry[]

const meta = {
  title: 'Dock/Shell/Embedded',
  component: DockEmbedded,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false, height: '540px' },
      description: {
        component: 'The full embedded shell as injected into a host app: the dock bar plus panel (float or edge), floating overlays, command palette, toasts and confirm dialog — switched by `panel.store.mode`.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj

/** Float mode, panel closed — just the resting dock bar. */
export const FloatClosed: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: categorizedEntries, panel: { mode: 'float', position: 'bottom', left: 50, top: 100, inactiveTimeout: -1 } },
      ctx => h(DockEmbedded, { context: ctx }),
    ),
  }),
}

/** Float mode with the panel open over an `about:blank` iframe. */
export const FloatOpen: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: blankEntries, selectedId: 'overview', panel: { mode: 'float', position: 'bottom', left: 50, top: 100, inactiveTimeout: -1, width: 60, height: 60 } },
      ctx => h(DockEmbedded, { context: ctx }),
    ),
  }),
}

/** Edge mode, docked to the bottom with the panel open. */
export const Edge: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: blankEntries, selectedId: 'overview', panel: { mode: 'edge', position: 'bottom', open: true, height: 45 } },
      ctx => h(DockEmbedded, { context: ctx }),
    ),
  }),
}

/** Unauthorized — the shell forces float mode and shows the warning. */
export const Unauthorized: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: categorizedEntries, isTrusted: false, panel: { mode: 'edge', position: 'bottom', inactiveTimeout: -1 } },
      ctx => h(DockEmbedded, { context: ctx }),
    ),
  }),
}
