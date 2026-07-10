import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'
import KeybindingBadge from './KeybindingBadge.vue'

const meta = {
  title: 'Commands/KeybindingBadge',
  component: KeybindingBadge,
  tags: ['autodocs'],
  decorators: [() => ({ template: '<div class="p6 font-sans"><story /></div>' })],
  args: { keyString: 'Mod+K' },
} satisfies Meta<typeof KeybindingBadge>

export default meta
type Story = StoryObj<typeof meta>

/** A single chord, formatted for the current platform (⌘ on macOS, Ctrl elsewhere). */
export const Default: Story = {}

/** A shortcut with a modifier and shift. */
export const WithShift: Story = { args: { keyString: 'Mod+Shift+P' } }

/** A plain key. */
export const SingleKey: Story = { args: { keyString: 'Escape' } }

/** Several badges together, as the palette lists them. */
export const Gallery: Story = {
  render: () => ({
    setup: () => () => h('div', { class: 'flex flex-col gap-2 items-start p6 font-sans' }, [
      h(KeybindingBadge, { keyString: 'Mod+K' }),
      h(KeybindingBadge, { keyString: 'Mod+Shift+P' }),
      h(KeybindingBadge, { keyString: 'Escape' }),
      h(KeybindingBadge, { keyString: 'Alt+ArrowUp' }),
    ]),
  }),
}
