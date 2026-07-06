import type { Meta, StoryObj } from '@storybook/vue3-vite'
import CommandPalette from '../components/command-palette/CommandPalette.vue'
import { contextStory } from './story-utils'

/**
 * The command palette (Cmd/Ctrl+K) surfaces every registered command —
 * server-side commands plus the client navigation/settings/dock-mode commands
 * seeded by the context — with fuzzy search and keyboard-driven selection.
 */
const meta = {
  title: 'Command Palette',
  component: CommandPalette,
  parameters: {
    docs: {
      description: {
        component:
          'Cmd/Ctrl+K palette listing server and client commands with fuzzy search, nested groups, and keybinding hints.',
      },
    },
  },
} satisfies Meta<typeof CommandPalette>

export default meta
type Story = StoryObj<typeof meta>

function renderPalette(context: any) {
  return {
    components: { CommandPalette },
    setup: () => ({ context }),
    template: `<div class="min-h-100"><CommandPalette :context="context" /></div>`,
  }
}

/** The palette open, listing all seeded commands. */
export const Open: Story = contextStory({
  prepare: (context) => {
    context.commands.paletteOpen = true
  },
  render: renderPalette,
}) as Story
