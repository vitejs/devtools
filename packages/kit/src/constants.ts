import type { DevToolsDockEntryCategory, DevToolsDocksUserSettings } from './types'

// DevTools runtime routes and static output conventions.
export const DEVTOOLS_MOUNT_PATH = '/.devtools/'
export const DEVTOOLS_MOUNT_PATH_NO_TRAILING_SLASH = '/.devtools'
export const DEVTOOLS_DIRNAME = '.devtools'

export const DEVTOOLS_CONNECTION_META_FILENAME = '.vdt-connection.json'
export const DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME = '.vdt-rpc-dump.json'
export const DEVTOOLS_DOCK_IMPORTS_FILENAME = '.devtools-imports.js'
export const DEVTOOLS_DOCK_IMPORTS_VIRTUAL_ID = '/.devtools-imports'
export const DEVTOOLS_RPC_DUMP_API_DIRNAME = 'api'

export const DEVTOOLS_RPC_DUMP_STATIC_DIR = 'api/rpc/static'
export const DEVTOOLS_RPC_DUMP_QUERY_DIR = 'api/rpc/query'
export const DEVTOOLS_RPC_DUMP_QUERY_RECORDS_DIRNAME = 'records'
export const DEVTOOLS_RPC_DUMP_QUERY_INDEX_FILENAME = 'index.json'
export const DEVTOOLS_RPC_DUMP_QUERY_FALLBACK_FILENAME = 'fallback.json'

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
})
