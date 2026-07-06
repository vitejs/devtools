import { fileURLToPath } from 'node:url'
import { sharedShortcuts } from '@vitejs/devtools-ui/unocss/shared-shortcuts'
import { theme } from '@vitejs/devtools-ui/unocss/theme'
import {
  defineConfig,
  presetIcons,
  presetWind3,
  transformerDirectives,
} from 'unocss'

// Mirrors the webcomponents UnoCSS config (`src/client/webcomponents/uno.config.ts`)
// with two Storybook-specific tweaks:
//   1. `dark: 'class'` so a toolbar toggle can flip the theme via a `.dark`
//      class (production uses `media`, baked into the shadow-DOM CSS blob).
//   2. filesystem scanning of the component sources + stories, since the
//      components render in the light DOM here and UnoCSS runs live.
export default defineConfig({
  shortcuts: [
    ...sharedShortcuts,
    {
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
      dark: 'class',
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
  content: {
    filesystem: [
      fileURLToPath(new URL('../src/client/webcomponents/components/**/*.{vue,ts}', import.meta.url)),
      fileURLToPath(new URL('../src/client/**/*.stories.ts', import.meta.url)),
    ],
  },
})
