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
  [/^bg-glass(:\d+)?$/, ([, opacity = ':50']) => `bg-white${opacity} dark:bg-#111${opacity} backdrop-blur-7`],
]
