import type { Meta, StoryObj } from '@storybook/vue3-vite'
import type { DevToolsViewBuiltin } from '@vitejs/devtools-kit'
import { h } from 'vue'
import { groupedEntries } from '../../stories/fixtures'
import { mountWithContext } from '../../stories/story-helpers'
import ViewBuiltinSettings from './ViewBuiltinSettings.vue'

const entry: DevToolsViewBuiltin = {
  type: '~builtin',
  id: '~settings',
  title: 'Settings',
  icon: 'ph:gear-duotone',
}

function stage(children: any) {
  return h('div', { class: 'h-140 bg-base color-base border border-base rounded-lg overflow-hidden font-sans' }, children)
}

const meta = {
  title: 'Views/Builtin/Settings',
  component: ViewBuiltinSettings,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'The built-in settings view: Appearance, Docks, Shortcuts and Advanced tabs. Click the tabs to switch.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj

/** Embedded client — the Appearance tab shows dock-mode options. */
export const Embedded: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: groupedEntries, clientType: 'embedded' },
      ctx => stage(h(ViewBuiltinSettings, { context: ctx, entry })),
    ),
  }),
}

/** Standalone client — dock-mode options are hidden. */
export const Standalone: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: groupedEntries, clientType: 'standalone' },
      ctx => stage(h(ViewBuiltinSettings, { context: ctx, entry })),
    ),
  }),
}
