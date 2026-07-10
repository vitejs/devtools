import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { defineComponent, h, onMounted } from 'vue'
import { groupedEntries } from '../../stories/fixtures'
import { mountWithContext } from '../../stories/story-helpers'
import CommandPalette from './CommandPalette.vue'

const meta = {
  title: 'Commands/Palette',
  component: CommandPalette,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    // Fixed, full-screen overlay — render in an iframe for the docs canvas.
    docs: {
      story: { inline: false, height: '480px' },
      description: {
        component: 'The ⌘K command palette. Lists client + server commands (and dock navigation), supports fuzzy search and drill-down into grouped commands.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj

/**
 * The palette opened over the built-in and dock-navigation commands.
 *
 * `paletteOpen` is flipped in `onMounted` (not before mount): the palette's
 * open transition keys off the `show` change, so a value that's already `true`
 * at mount would leave it stuck at `opacity-0`.
 */
export const Open: Story = {
  render: () => ({
    setup: () => mountWithContext(
      { entries: groupedEntries },
      ctx => h(defineComponent({
        setup() {
          onMounted(() => {
            ctx.commands.paletteOpen = true
          })
          return () => h(CommandPalette, { context: ctx })
        },
      })),
    ),
  }),
}
