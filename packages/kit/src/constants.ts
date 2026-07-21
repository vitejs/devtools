import type { DevToolsDockEntryCategory } from './types/docks'
import type { DevToolsDocksUserSettings } from './types/settings'

export { DEFAULT_STATE_USER_SETTINGS } from '@devframes/hub/constants'

// Filename / dirname constants whose *values* are unchanged across the
// devframe `DevTools*` → `Devframe*` rename. Re-export them under both
// names so downstream code that imports `DEVTOOLS_*` keeps compiling.
export {
  DEVFRAME_CONNECTION_META_FILENAME as DEVTOOLS_CONNECTION_META_FILENAME,
  DEVFRAME_DOCK_IMPORTS_FILENAME as DEVTOOLS_DOCK_IMPORTS_FILENAME,
  DEVFRAME_RPC_DUMP_DIRNAME as DEVTOOLS_RPC_DUMP_DIRNAME,
  DEVFRAME_RPC_DUMP_MANIFEST_FILENAME as DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME,
  REMOTE_CONNECTION_KEY,
} from 'devframe/constants'

// Kit-side mount path is pinned at `/__devtools/` regardless of devframe's
// new `/__devframe/` default. The hosted (Vite-mounted) flow always passes
// the base path explicitly to `ctx.views.hostStatic()` and to the Vite
// middleware, so the kit owns the value.
export const DEVTOOLS_MOUNT_PATH = '/__devtools/'
export const DEVTOOLS_MOUNT_PATH_NO_TRAILING_SLASH = '/__devtools'
export const DEVTOOLS_DIRNAME = '__devtools'

/**
 * Single upgrade route the RPC WebSocket binds to when it shares the Vite dev
 * server (route-bound mode). `DEVTOOLS_WS_ROUTE` is the relative form written
 * into `__connection.json` (resolved by the client against the meta file's
 * `/__devtools/` location); `DEVTOOLS_WS_PATH` is the absolute upgrade path the
 * server binds and the remote-dock endpoint URL embeds.
 */
export const DEVTOOLS_WS_ROUTE = '__ws'
export const DEVTOOLS_WS_PATH = `${DEVTOOLS_MOUNT_PATH}${DEVTOOLS_WS_ROUTE}`
export const DEVTOOLS_DOCK_IMPORTS_VIRTUAL_ID = '/__devtools-client-imports.js'

/**
 * Id of the built-in dock group that collects Vite Plus integrations
 * (Rolldown, etc.) under a single "Vite+" dock button. Vite DevTools seeds
 * this group; integrations join it by setting `groupId` to this value.
 */
export const DEVTOOLS_VITEPLUS_GROUP_ID = '~viteplus'

/**
 * Dock id of the built-in Devframe Inspector (mounted from
 * `@devframes/plugin-inspect`). Shared between the node side (which pins the
 * mounted devframe to this id) and the client (which gates the dock behind the
 * `showDevframeInspector` user setting). Mirrors the plugin's `PLUGIN_ID`.
 */
export const DEVTOOLS_INSPECTOR_DOCK_ID = 'devframes_plugin_inspect'

/**
 * Dock id of the built-in Terminals feed (from `@devframes/plugin-terminals`).
 * A launcher tracking a terminal session targets this dock via
 * `hub:docks:activate({ dockId, params: { sessionId } })` to jump the user
 * straight to that session's output. Mirrors the plugin's `PLUGIN_ID`.
 */
export const DEVTOOLS_TERMINALS_DOCK_ID = 'devframes_plugin_terminals'

export const DEFAULT_CATEGORIES_ORDER: Record<string, number> = {
  'default': 0,
  'app': 100,
  'framework': 200,
  'web': 300,
  'advanced': 400,
  '~builtin': 1000,
} satisfies Record<DevToolsDockEntryCategory, number>

export type { DevToolsDocksUserSettings }
