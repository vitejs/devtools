import type { Meta, StoryObj } from '@storybook/vue3-vite'
import type { DevToolsCommandEntry } from '@vitejs/devtools-kit'
import CommandPaletteItem from './CommandPaletteItem.vue'

const entry: DevToolsCommandEntry = {
  id: 'devtools:open-settings',
  source: 'client',
  title: 'Open Settings',
  icon: 'ph:gear-duotone',
} as DevToolsCommandEntry

const meta = {
  title: 'Commands/PaletteItem',
  component: CommandPaletteItem,
  tags: ['autodocs'],
  decorators: [() => ({ template: '<div class="max-w-120 p4 bg-base color-base font-sans"><story /></div>' })],
  args: {
    entry,
    showParentTitle: false,
    selected: false,
    loading: false,
    keybindings: [],
  },
} satisfies Meta<typeof CommandPaletteItem>

export default meta
type Story = StoryObj<typeof meta>

/** A resting command row. */
export const Default: Story = {}

/** The highlighted (keyboard-focused) row. */
export const Selected: Story = { args: { selected: true } }

/** With a keybinding badge on the right. */
export const WithKeybinding: Story = {
  args: { keybindings: [{ key: 'Mod+,' }] },
}

/** A child command showing its parent group as a prefix. */
export const WithParentTitle: Story = {
  args: { parentTitle: 'Docks', showParentTitle: true },
}

/** Mid-execution: the row shows a spinner. */
export const Loading: Story = { args: { loading: true, selected: true } }
