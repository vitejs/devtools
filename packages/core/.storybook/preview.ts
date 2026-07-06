import type { Preview } from '@storybook/vue3-vite'
import { h } from 'vue'

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
      return {
        components: { story },
        render: () => h('div', { class: 'vite-devtools-storybook-root color-base bg-base' }, [h(story)]),
      }
    },
  ],
}

export default preview
