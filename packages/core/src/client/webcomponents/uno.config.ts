import {
  defineConfig,
  presetIcons,
  presetWind3,
  transformerDirectives,
} from 'unocss'

export default defineConfig({
  shortcuts: [
    {
      'color-base': 'color-neutral-800 dark:color-neutral-200',
      'bg-base': 'bg-white dark:bg-#111',
      'bg-active': 'bg-#8881',
      'bg-secondary': 'bg-#eee dark:bg-#222',
      'border-base': 'border-#8882',
      'ring-base': 'ring-#8882',

      'z-viewframe': 'z-20',
      'z-viewframe-resizer': 'z-30',
      'z-floating-dock': 'z-50',
      'z-floating-anchor': 'z-[2147483644]',
      'z-floating-tooltip': 'z-[2147483645]',
    },
    [/^bg-glass(:\d+)?$/, ([, opacity = ':50']) => `bg-white${opacity} dark:bg-#111${opacity} backdrop-blur-5`],
  ],
  transformers: [
    transformerDirectives(),
  ],
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
