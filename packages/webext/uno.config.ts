import { sharedShortcuts } from '@vitejs/devtools-ui/unocss/shared-shortcuts'
import { theme } from '@vitejs/devtools-ui/unocss/theme'
import {
  defineConfig,
  presetIcons,
  presetWind3,
  transformerDirectives,
} from 'unocss'

export default defineConfig({
  shortcuts: [
    ...sharedShortcuts,
    {
      'status-ready': 'bg-green-500/10 color-green-600 dark:color-green-400',
    },
  ],
  transformers: [
    transformerDirectives(),
  ],
  theme: {
    colors: theme.colors,
  },
  presets: [
    presetWind3({
      dark: 'media',
      variablePrefix: 'vdt-',
    }),
    presetIcons({
      warn: true,
      collections: {
        logos: () => import('@iconify-json/logos').then(i => i.icons),
        ph: () => import('@iconify-json/ph').then(i => i.icons),
      },
    }),
  ],
})
