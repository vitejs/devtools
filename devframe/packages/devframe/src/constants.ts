// DevTools runtime routes and static output conventions.
export const DEVTOOLS_MOUNT_PATH = '/__devtools/'
export const DEVTOOLS_MOUNT_PATH_NO_TRAILING_SLASH = '/__devtools'
export const DEVTOOLS_DIRNAME = '__devtools'

export const DEVTOOLS_CONNECTION_META_FILENAME = '__connection.json'
export const DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME = '__rpc-dump/index.json'
export const DEVTOOLS_DOCK_IMPORTS_FILENAME = '__client-imports.js'
export const DEVTOOLS_DOCK_IMPORTS_VIRTUAL_ID = '/__devtools-client-imports.js'
export const DEVTOOLS_RPC_DUMP_DIRNAME = '__rpc-dump'

/**
 * URL fragment / query parameter name carrying the remote dock
 * connection descriptor (defined as `RemoteConnectionInfo` in
 * `@vitejs/devtools-kit`) injected into remote-UI iframe dock URLs.
 */
export const REMOTE_CONNECTION_KEY = 'vite-devtools-kit-connection'
