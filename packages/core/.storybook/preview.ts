import type { Preview } from '@storybook/vue3-vite'

import '@unocss/reset/tailwind.css'
import '@xterm/xterm/css/xterm.css'
import 'uno.css'
import './preview.css'

type Theme = 'dark' | 'light'

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  globalTypes: {
    theme: {
      description: 'DevTools color theme',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'dark', title: 'Dark', icon: 'moon' },
          { value: 'light', title: 'Light', icon: 'sun' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'dark',
  },
  decorators: [
    (story, context) => {
      applyTheme((context.globals.theme as Theme) ?? 'dark')
      // Wrap via a template so Storybook composes the StoryFn into a real
      // component. Rendering the raw `story` fn through `h()` coerces its
      // return to a text node ("[object Object]").
      return {
        components: { story },
        template: `<div class="vite-devtools-storybook-root color-base bg-base"><story /></div>`,
      }
    },
  ],
}

export default preview
