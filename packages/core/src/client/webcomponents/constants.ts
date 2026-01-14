import type { DevToolsDockEntryCategory, DevToolsViewBuiltin } from '@vitejs/devtools-kit'

export const BUILTIN_ENTRY_CLIENT_AUTH_NOTICE: DevToolsViewBuiltin = Object.freeze({
  type: '~builtin',
  id: '~client-auth-notice',
  title: 'Unauthorized',
  icon: 'i-fluent-emoji-flat-warning',
})

export const BUILTIN_ENTRIES: readonly DevToolsViewBuiltin[] = Object.freeze([
  BUILTIN_ENTRY_CLIENT_AUTH_NOTICE,
])

export const DEFAULT_CATEGORIES_ORDER: Record<string, number> = {
  '~viteplus': -1000,
  'default': 0,
  'app': 100,
  'framework': 200,
  'web': 300,
  'advanced': 400,
  '~builtin': 1000,
} satisfies Record<DevToolsDockEntryCategory, number>
