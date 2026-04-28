import type { DevToolsDockEntryCategory, DevToolsDocksUserSettings } from './types'

// DevTools runtime routes and static output conventions.
export const DEVTOOLS_MOUNT_PATH = '/.devtools/'
export const DEVTOOLS_MOUNT_PATH_NO_TRAILING_SLASH = '/.devtools'
export const DEVTOOLS_DIRNAME = '.devtools'

export const DEVTOOLS_CONNECTION_META_FILENAME = '.connection.json'
export const DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME = '.rpc-dump/index.json'
export const DEVTOOLS_DOCK_IMPORTS_FILENAME = '.client-imports.js'
export const DEVTOOLS_DOCK_IMPORTS_VIRTUAL_ID = '/.devtools-client-imports.js'
export const DEVTOOLS_RPC_DUMP_DIRNAME = '.rpc-dump'

/**
 * URL fragment / query parameter name carrying the {@link RemoteConnectionInfo}
 * descriptor injected into remote-UI iframe dock URLs.
 */
export const REMOTE_CONNECTION_KEY = 'vite-devtools-kit-connection'

export const DEFAULT_CATEGORIES_ORDER: Record<string, number> = {
  '~viteplus': -1000,
  'default': 0,
  'app': 100,
  'framework': 200,
  'web': 300,
  'advanced': 400,
  '~builtin': 1000,
} satisfies Record<DevToolsDockEntryCategory, number>

export const DEFAULT_STATE_USER_SETTINGS: () => DevToolsDocksUserSettings = () => ({
  docksHidden: [],
  docksCategoriesHidden: [],
  docksPinned: [],
  docksCustomOrder: {},
  showIframeAddressBar: false,
  closeOnOutsideClick: false,
  commandShortcuts: {},
})
