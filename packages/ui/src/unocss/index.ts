import type { Theme } from '@unocss/preset-wind4'
import {
  definePreset,
  mergeDeep,
  presetIcons,
  presetTypography,
  presetWind4,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'
import { shortcuts } from './shortcuts'
import { theme as devtoolsDefaultTheme } from './theme'

export interface PresetDevToolsUIOptions {
  theme?: Theme
}

export const presetDevToolsUI = definePreset<PresetDevToolsUIOptions, Theme>((options) => {
  return {
    name: '@vitejs/devtools-ui/preset',
    shortcuts,
    extendTheme(defaultTheme) {
      return mergeDeep(defaultTheme, options?.theme ?? devtoolsDefaultTheme)
    },
    presets: [
      presetWind4(),
      presetIcons({
        scale: 1.2,
      }),
      presetTypography(),
    ],
    transformers: [
      transformerDirectives(),
      transformerVariantGroup(),
    ],
  }
})
