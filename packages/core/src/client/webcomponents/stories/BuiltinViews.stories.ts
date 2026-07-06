import type { Meta, StoryObj } from '@storybook/vue3-vite'
import type { DevToolsViewBuiltin } from '@vitejs/devtools-kit'
import SettingsAppearance from '../components/views-builtin/SettingsAppearance.vue'
import ViewBuiltinClientAuthNotice from '../components/views-builtin/ViewBuiltinClientAuthNotice.vue'
import ViewBuiltinMessages from '../components/views-builtin/ViewBuiltinMessages.vue'
import ViewBuiltinSettings from '../components/views-builtin/ViewBuiltinSettings.vue'
import ViewBuiltinTerminals from '../components/views-builtin/ViewBuiltinTerminals.vue'
import { resetMessagesState, useMessages } from '../state/messages'
import { resetTerminalsState } from '../state/terminals'
import { messagesFixture } from './mock/messages'
import { terminalBuffers, terminalSessionsFixture } from './mock/terminals'
import { contextStory } from './story-utils'

/**
 * Built-in views ship with every DevTools instance: the settings panels, the
 * messages log, the terminals panel, and the client-auth notice.
 */
const meta = {
  title: 'Views/Built-in',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Views bundled with every DevTools instance — settings, messages log, terminals, and the client-auth notice.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj

const SETTINGS_ENTRY: DevToolsViewBuiltin = { type: '~builtin', id: '~settings', title: 'Settings', icon: 'ph:gear-duotone' }

function box(inner: string) {
  return `<div class="w-full h-150 border border-base rounded-lg overflow-hidden bg-base color-base">${inner}</div>`
}

/** The full settings view (appearance, docks, shortcuts, advanced). */
export const Settings: Story = contextStory({
  render: context => ({
    components: { ViewBuiltinSettings },
    setup: () => ({ context, entry: SETTINGS_ENTRY }),
    template: box(`<ViewBuiltinSettings :context="context" :entry="entry" />`),
  }),
}) as Story

/** Just the appearance settings sub-panel. */
export const SettingsAppearanceOnly: Story = contextStory({
  render: context => ({
    components: { SettingsAppearance },
    setup: () => ({ context, settingsStore: context.docks.settings }),
    template: box(`<div class="p4"><SettingsAppearance :context="context" :settings-store="settingsStore" /></div>`),
  }),
}) as Story

/** The messages log populated with entries across all severity levels. */
export const Messages: Story = contextStory({
  context: {
    callHandlers: {
      'devtoolskit:internal:messages:list': () => ({
        removedIds: [],
        entries: messagesFixture(),
        version: 1,
      }),
    },
  },
  prepare: (context) => {
    // Re-initialize the singleton against this story's context so it fetches
    // the seeded fixture instead of whatever a prior story left behind.
    resetMessagesState()
    useMessages(context)
  },
  render: context => ({
    components: { ViewBuiltinMessages },
    setup: () => ({ context }),
    template: box(`<ViewBuiltinMessages :context="context" />`),
  }),
}) as Story

/** The terminals panel with several sessions and seeded scrollback. */
export const Terminals: Story = contextStory({
  context: {
    callHandlers: {
      'devtoolskit:internal:terminals:list': () => terminalSessionsFixture(),
      'devtoolskit:internal:terminals:read': (id: string) => ({ buffer: terminalBuffers()[id] ?? [] }),
    },
  },
  prepare: () => {
    resetTerminalsState()
  },
  render: context => ({
    components: { ViewBuiltinTerminals },
    setup: () => ({ context }),
    template: box(`<ViewBuiltinTerminals :context="context" />`),
  }),
}) as Story

/** The notice shown when the RPC client is not yet trusted. */
export const ClientAuthNotice: Story = contextStory({
  context: { isTrusted: false },
  render: context => ({
    components: { ViewBuiltinClientAuthNotice },
    setup: () => ({ context }),
    template: box(`<ViewBuiltinClientAuthNotice :context="context" />`),
  }),
}) as Story
