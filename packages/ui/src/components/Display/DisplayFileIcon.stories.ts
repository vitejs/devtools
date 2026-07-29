import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'
import DisplayFileIcon from './DisplayFileIcon.vue'

const meta = {
  title: 'Display/DisplayFileIcon',
  component: DisplayFileIcon,
  tags: ['autodocs'],
  args: { filename: 'src/App.vue' },
  parameters: {
    docs: { description: { component: 'Maps a module id/filename to its file-type icon (Catppuccin icon set).' } },
  },
} satisfies Meta<typeof DisplayFileIcon>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Types: Story = {
  render: () => ({
    setup: () => () => h('div', { class: 'flex items-center gap-3 p6 text-2xl' }, ['App.vue', 'main.ts', 'index.js', 'style.css', 'data.json', 'readme.md', 'logo.svg', 'app.svelte']
      .map(filename => h(DisplayFileIcon, { key: filename, filename }))),
  }),
}
