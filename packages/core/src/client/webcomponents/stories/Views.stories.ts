import type { Meta, StoryObj } from '@storybook/vue3-vite'
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import { ref } from 'vue'
import ViewEntry from '../components/views/ViewEntry.vue'
import { useIframePanes } from '../utils/useIframePanes'
import { dockEntriesFixture } from './mock/fixtures'
import { jsonRenderSpecFixture } from './mock/json-render-spec'
import { contextStory } from './story-utils'

/**
 * A dock view is the content pane for a selected entry. `ViewEntry` picks the
 * concrete renderer from the entry type: an iframe frame, a launcher card, a
 * json-render spec, a custom-render script, or a built-in view.
 */
const meta = {
  title: 'Views/Frames',
  component: ViewEntry,
  parameters: {
    docs: {
      description: {
        component:
          'The content pane for a selected dock entry. `ViewEntry` dispatches on entry type — iframe, launcher, json-render, custom-render, or built-in.',
      },
    },
  },
} satisfies Meta<typeof ViewEntry>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Render `ViewEntry` for one entry inside a bordered box that owns an
 * iframe-pane overlay container, exactly like the dock shells do.
 */
function renderView(entryId: string) {
  return (context: any) => ({
    components: { ViewEntry },
    setup() {
      const container = ref<HTMLElement | null>(null)
      const panes = useIframePanes(container, context.panel)
      const entry = context.docks.entries.find((e: DevToolsDockEntry) => e.id === entryId)
      return { context, entry, panes, container }
    },
    template: `
      <div class="relative w-full h-100 border border-base rounded-lg overflow-hidden bg-base color-base">
        <ViewEntry v-if="panes && entry" :key="entry.id" :context="context" :entry="entry" :panes="panes" />
        <div ref="container" class="absolute inset-0 pointer-events-none" />
      </div>
    `,
  })
}

/** An iframe frame embedding an external URL (`about:blank` here). */
export const Iframe: Story = contextStory({
  context: { selectedId: 'overview' },
  render: renderView('overview'),
}) as Story

/** A launcher card — a call-to-action that starts a process, then swaps to a frame. */
export const Launcher: Story = contextStory({
  context: { selectedId: 'launcher' },
  render: renderView('launcher'),
}) as Story

/** A json-render view: server-authored UI spec rendered via the component registry. */
export const JsonRender: Story = contextStory({
  context: {
    entries: [
      ...dockEntriesFixture(),
      {
        type: 'json-render',
        id: 'build-summary',
        title: 'Build Summary',
        icon: 'ph:chart-bar-duotone',
        ui: { _stateKey: 'story:json-render' } as any,
      },
    ],
    sharedStates: { 'story:json-render': jsonRenderSpecFixture() },
    selectedId: 'build-summary',
  },
  render: renderView('build-summary'),
}) as Story
