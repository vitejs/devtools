import type { Preview } from '@storybook/vue3-vite'
import { GLOBALS_UPDATED } from 'storybook/internal/core-events'
import { addons } from 'storybook/preview-api'
import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
// The dock shells rely on the `#vite-devtools-*` id selectors shipped here.
import '../../packages/core/src/client/webcomponents/style.css'
import './docs-dark.css'

// The manager (chrome) and preview (iframe) are separate roots; toggle the
// preview root from the global so docs/MDX pages theme too.
addons.getChannel().on(GLOBALS_UPDATED, ({ globals }: { globals?: { theme?: string } }) => {
  document.documentElement.classList.toggle('dark', globals?.theme === 'dark')
})

const preview: Preview = {
  parameters: {
    options: { storySort: { order: ['Overview', 'Dock', '*'] } },
    layout: 'fullscreen',
  },
  globalTypes: {
    theme: {
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
      },
    },
  },
  decorators: [
    // Use the template-based `<story/>` decorator (the stable Storybook Vue API)
    // rather than `h(story())` — under the vue3-vite renderer `story()` no longer
    // returns a component, so hand-wrapping it mounts an `undefined` vnode.
    (_story, ctx) => ({
      setup() {
        document.documentElement.classList.toggle('dark', ctx.globals.theme === 'dark')
      },
      template: '<div class="bg-base color-base font-sans min-h-screen"><story /></div>',
    }),
  ],
}

export default preview
