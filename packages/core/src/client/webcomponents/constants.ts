import type { DevToolsViewBuiltin } from '@vitejs/devtools-kit'

export const BUILTIN_ENTRY_CLIENT_AUTH_NOTICE: DevToolsViewBuiltin = Object.freeze({
  type: '~builtin',
  id: '~client-auth-notice',
  title: 'Unauthorized',
  icon: 'i-fluent-emoji-flat-warning',
})

export const BUILTIN_ENTRIES: readonly DevToolsViewBuiltin[] = Object.freeze([
  BUILTIN_ENTRY_CLIENT_AUTH_NOTICE,
])
