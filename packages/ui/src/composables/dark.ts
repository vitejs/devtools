import type { WritableComputedRef } from 'vue'
import { usePreferredDark, useStorage } from '@vueuse/core'
import { computed, watchEffect } from 'vue'

export type ColorSchemePreference = 'auto' | 'dark' | 'light'

const preference = useStorage<ColorSchemePreference>('vite-devtools-color-scheme', 'auto')
const preferredDark = usePreferredDark()

export const isDark: WritableComputedRef<boolean> = computed({
  get: () => (preference.value === 'auto' ? preferredDark.value : preference.value === 'dark'),
  set: (value) => { preference.value = value ? 'dark' : 'light' },
})

export function toggleDark() {
  isDark.value = !isDark.value
}

export function applyDarkClassToHtml() {
  if (typeof document === 'undefined')
    return
  watchEffect(() => {
    const el = document.documentElement
    el.classList.toggle('dark', isDark.value)
    el.classList.toggle('light', !isDark.value)
  })
}
