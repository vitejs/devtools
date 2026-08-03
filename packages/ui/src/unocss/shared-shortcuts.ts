import type { DynamicShortcut, StaticShortcutMap } from '@unocss/core'

/**
 * Base semantic shortcuts shared between Wind3 (webcomponents) and Wind4 (Nuxt UIs).
 * These define the core visual identity tokens that must stay consistent across all surfaces.
 */
export const sharedShortcuts: (StaticShortcutMap | DynamicShortcut)[] = [
  {
    'color-base': 'color-neutral-800 dark:color-neutral-200',
    'bg-base': 'bg-white dark:bg-#111',
    'bg-active': 'bg-#8881',
    'bg-secondary': 'bg-#eee dark:bg-#222',
    'border-base': 'border-#8882',
    'ring-base': 'ring-#8882',
    'color-active': 'color-primary-600 dark:color-primary-300',
    'border-active': 'border-primary-600/25 dark:border-primary-400/25',
  },
  // `bg-glass` / `bg-glass:75` — translucent surface + backdrop blur.
  [
    /^bg-glass(?::(\d+))?$/,
    ([, opacity = '50']) => {
      const opInt = parseInt(opacity, 10)
      if (Number.isNaN(opInt) || opInt < 0 || opInt > 100)
        return
      const op = Math.min(Math.max(opInt, 0), 100)
      return `bg-white/${Math.min(Math.max(Math.round(opInt * 1.3), 0), 100)} dark:bg-#111/${op} backdrop-blur-7`
    },
    { layer: 'shortcuts' },
  ],
]
