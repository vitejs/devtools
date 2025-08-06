import { fileURLToPath } from 'node:url'
import { createLocalFontProcessor } from '@unocss/preset-web-fonts/local'
import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetWebFonts,
  presetWind4,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  shortcuts: [
    {
      'color-base': 'color-neutral-800 dark:color-neutral-300',
      'bg-base': 'bg-white dark:bg-#111',
      'bg-secondary': 'bg-#eee dark:bg-#222',
      'border-base': 'border-#8884',

      'border-flow': 'border-#8885',
      'border-flow-line': 'border-#ccc dark:border-#222',
      'border-flow-active': 'border-primary-700/50 dark:border-primary-300/50',
      'border-flow-line-active': 'border-primary-700/30 dark:border-primary-300/30',

      'fg-flow-line': 'color-#ccc dark:color-#222',
      'fg-flow-line-active': 'color-primary-700/30 dark:color-primary-300/30',

      'bg-tooltip': 'bg-white:75 dark:bg-#111:75 backdrop-blur-8',
      'bg-code': 'bg-gray-500:5',

      'bg-gradient-more': 'bg-gradient-to-t from-white via-white:80 to-white:0 dark:from-#111 dark:via-#111:80 dark:to-#111:0',

      'color-active': 'color-primary-600 dark:color-primary-300',
      'border-active': 'border-primary-600/25 dark:border-primary-400/25',
      'bg-active': 'bg-#8881',

      'btn-action': 'border border-base rounded flex gap-2 items-center px2 py1 op75 hover:op100 hover:bg-active disabled:pointer-events-none disabled:op30!',
      'btn-action-sm': 'btn-action text-sm',
      'btn-action-active': 'color-active border-active! bg-active op100!',

      'icon-catppuccin': 'light:filter-invert-100 light:filter-hue-rotate-180 light:filter-brightness-80',

      'z-flowmap-line': 'z--1',
      'z-graph-bg': 'z-5',
      'z-graph-link': 'z-10',
      'z-graph-node': 'z-11',
      'z-graph-link-active': 'z-12',
      'z-graph-node-active': 'z-13',

      'z-panel-no-mobile': 'z-55',
      'z-panel-nav': 'z-60',
      'z-panel-content': 'z-65',
      'z-panel-goto': 'z-70',
      'z-panel-terminal': 'z-80',

      'op-fade': 'op65 dark:op55',
      'op-mute': 'op30 dark:op25',
      'color-deprecated': 'text-op85 text-[#b71c1c] dark:text-[#f87171]',

      'color-scale-neutral': 'text-gray-700:75 dark:text-gray-300:75!',
      'color-scale-low': 'text-lime-700:75 dark:text-lime-300:75! dark:saturate-50',
      'color-scale-medium': 'text-amber-700:85 dark:text-amber-300:85! dark:saturate-80',
      'color-scale-high': 'text-orange-700:95 dark:text-orange-300:95!',
      'color-scale-critical': 'text-red-700:95 dark:text-red-300:95!',

      'page-padding': 'pt-24 pl-112 pr-8 pb-8',
      'page-padding-collapsed': 'pt-24 pl-14 pr-8 pb-8',
    },
    [/^badge-color-(\w+)$/, ([, color]) => `bg-${color}-400:20 dark:bg-${color}-400:10 text-${color}-700 dark:text-${color}-300 border-${color}-600:10 dark:border-${color}-300:10`],
    [/^bg-glass(:\d+)?$/, ([, opacity = ':75']) => `bg-white${opacity} dark:bg-#111${opacity} backdrop-blur-5`],
  ],
  theme: {
    colors: {
      primary: {
        50: '#fcf4ff',
        100: '#f7e5ff',
        200: '#f0d0ff',
        300: '#e5acff',
        400: '#d577ff',
        DEFAULT: '#d577ff',
        500: '#c543ff',
        600: '#bd34fe',
        700: '#9f0fe1',
        800: '#8512b7',
        900: '#6d1093',
        950: '#4d006e',
      },
    },
  },
  presets: [
    presetWind4({

    }),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
    }),
    presetTypography(),
    presetWebFonts({
      fonts: {
        sans: 'DM Sans:200,400,700',
        mono: 'DM Mono',
      },
      processors: createLocalFontProcessor({
        fontAssetsDir: fileURLToPath(new URL('./app/public/fonts', import.meta.url)),
        fontServeBaseUrl: './fonts',
      }),
    }),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
})
