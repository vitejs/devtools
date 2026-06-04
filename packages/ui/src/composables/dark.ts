import { useDark } from '@vueuse/core'

export const isDark = useDark({
  storageKey: 'vite-devtools-color-scheme',
  valueLight: 'light',
})

export function toggleDark() {
  isDark.value = !isDark.value
}
