import type { Meta, StoryObj } from '@storybook/vue3-vite'
import DockIcon from './DockIcon.vue'

const meta = {
  title: 'Dock/Icon',
  component: DockIcon,
  tags: ['autodocs'],
  // Render at a legible size — DockIcon fills its box. Use the template-based
  // `<story/>` decorator (the stable Storybook Vue API).
  decorators: [() => ({ template: '<div class="w-8 h-8"><story /></div>' })],
  argTypes: {
    icon: { control: false },
  },
} satisfies Meta<typeof DockIcon>

export default meta
type Story = StoryObj<typeof meta>

/** An Iconify collection reference (`collection:name`), fetched on demand. */
export const Iconify: Story = {
  args: { icon: 'ph:gauge-duotone' },
}

/** A logo-style Iconify icon, as a framework group would use. */
export const Logo: Story = {
  args: { icon: 'logos:nuxt-icon' },
}

/**
 * An object icon with distinct light/dark variants — only the one matching the
 * active theme is shown (toggle the theme toolbar to compare).
 */
export const LightDark: Story = {
  args: { icon: { light: 'ph:sun-duotone', dark: 'ph:moon-duotone' } },
}

/** The bundled Vite+ core mark, referenced by the sentinel `builtin:` id. */
export const BuiltinVitePlus: Story = {
  args: { icon: 'builtin:vite-plus-core' },
}

/** A raw image URL (here an inline data URI) rendered via `<img>`. */
export const ImageUrl: Story = {
  args: {
    icon: `data:image/svg+xml,${
      encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%23646cff"/></svg>')}`,
  },
}
