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
      // webcomponent-specific z-index
      'z-viewframe': 'z-20',
      'z-viewframe-resizer': 'z-30',
      'z-floating-dock': 'z-50',
      'z-floating-anchor': 'z-[2147483644]',
      'z-floating-tooltip': 'z-[2147483645]',
      'z-command-palette': 'z-[2147483646]',
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
