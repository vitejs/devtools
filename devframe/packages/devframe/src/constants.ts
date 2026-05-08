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
 * URL fragment / query parameter name carrying the remote dock
 * connection descriptor (defined as `RemoteConnectionInfo` in
 * `@vitejs/devtools-kit`) injected into remote-UI iframe dock URLs.
 */
export const REMOTE_CONNECTION_KEY = 'vite-devtools-kit-connection'
