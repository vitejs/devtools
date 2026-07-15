import { sharedShortcuts } from '@vitejs/devtools-ui/unocss/shared-shortcuts'
import { theme } from '@vitejs/devtools-ui/unocss/theme'
import {
  defineConfig,
  presetIcons,
  presetWind3,
  transformerDirectives,
} from 'unocss'

/**
 * Storybook mirror of the webcomponents `uno.config.ts`.
 *
 * Two deliberate deviations from the runtime config:
 * - `dark: 'class'` instead of `'media'`, so the Storybook theme toolbar can
 *   drive light/dark by toggling `.dark` on the preview root (the runtime lets
 *   the host shadow DOM decide via `prefers-color-scheme`).
 * - a wider `presetIcons` collection set, so the `i-*` utility icons used by the
 *   dock shells render without a network round-trip.
 */
export default defineConfig({
  shortcuts: [
    ...sharedShortcuts,
    {
      // webcomponent-specific z-index (kept in sync with the runtime config)
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
        'logos': () => import('@iconify-json/logos').then(i => i.icons),
        'ph': () => import('@iconify-json/ph').then(i => i.icons),
        'fluent-emoji-flat': () => import('@iconify-json/fluent-emoji-flat').then(i => i.icons),
        'carbon': () => import('@iconify-json/carbon').then(i => i.icons),
      },
    }),
  ],
})
