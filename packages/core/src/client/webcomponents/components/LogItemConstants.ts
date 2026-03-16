import type { DevToolsLogEntryFrom, DevToolsLogLevel } from '@vitejs/devtools-kit'

// @unocss-include

export interface LevelStyle {
  icon: string
  color: string
  bg: string
  label: string
}

export interface FromStyle {
  icon: string
  color: string
  label: string
}

export const levels: Record<DevToolsLogLevel, LevelStyle> = {
  info: { icon: 'i-ph:info-duotone', color: 'text-blue', bg: 'bg-blue', label: 'Info' },
  warn: { icon: 'i-ph:warning-duotone', color: 'text-amber', bg: 'bg-amber', label: 'Warning' },
  error: { icon: 'i-ph:x-circle-duotone', color: 'text-red', bg: 'bg-red', label: 'Error' },
  success: { icon: 'i-ph:check-circle-duotone', color: 'text-green', bg: 'bg-green', label: 'Success' },
  debug: { icon: 'i-ph:bug-duotone', color: 'text-gray', bg: 'bg-gray', label: 'Debug' },
}

export const formEntries: Record<DevToolsLogEntryFrom, FromStyle> = {
  server: { icon: 'i-ph:hexagon-duotone', color: 'text-green-800 dark:text-green-200', label: 'Server' },
  browser: { icon: 'i-ph:globe-simple-duotone', color: 'text-amber-800 dark:text-amber-200', label: 'Browser' },
}

// Intentionally uses fixed saturation/lightness (unlike @vitejs/devtools-ui/utils/color which
// is dark-mode-aware via Vue reactivity). Webcomponents run in shadow DOM with media-based dark
// mode, so they can't access the isDark composable.
export function getHashColorFromString(name: string, opacity: number = 1): string {
  let hash = 0
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const h = hash % 360
  return `hsla(${h}, 55%, 55%, ${opacity})`
}
