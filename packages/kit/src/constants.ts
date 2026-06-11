import type { DevToolsDockEntryCategory } from './types/docks'
import type { DevToolsDocksUserSettings } from './types/settings'

// Filename / dirname constants whose *values* are unchanged across the
// devframe `DevTools*` → `Devframe*` rename. Re-export them under both
// names so downstream code that imports `DEVTOOLS_*` keeps compiling.
export {
  DEFAULT_STATE_USER_SETTINGS,
  DEVFRAME_CONNECTION_META_FILENAME as DEVTOOLS_CONNECTION_META_FILENAME,
  DEVFRAME_DOCK_IMPORTS_FILENAME as DEVTOOLS_DOCK_IMPORTS_FILENAME,
  DEVFRAME_RPC_DUMP_DIRNAME as DEVTOOLS_RPC_DUMP_DIRNAME,
  DEVFRAME_RPC_DUMP_MANIFEST_FILENAME as DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME,
  REMOTE_CONNECTION_KEY,
} from '@devframes/hub/constants'

// Kit-side mount path is pinned at `/__devtools/` regardless of devframe's
// new `/__devframe/` default. The hosted (Vite-mounted) flow always passes
// the base path explicitly to `ctx.views.hostStatic()` and to the Vite
// middleware, so the kit owns the value.
export const DEVTOOLS_MOUNT_PATH = '/__devtools/'
export const DEVTOOLS_MOUNT_PATH_NO_TRAILING_SLASH = '/__devtools'
export const DEVTOOLS_DIRNAME = '__devtools'
export const DEVTOOLS_DOCK_IMPORTS_VIRTUAL_ID = '/__devtools-client-imports.js'

/**
 * Id of the built-in dock group that collects Vite Plus integrations
 * (Rolldown, etc.) under a single "Vite+" dock button. Vite DevTools seeds
 * this group; integrations join it by setting `groupId` to this value.
 */
export const DEVTOOLS_VITEPLUS_GROUP_ID = '~viteplus'

export const DEFAULT_CATEGORIES_ORDER: Record<string, number> = {
  'default': 0,
  'app': 100,
  'framework': 200,
  'web': 300,
  'advanced': 400,
  '~builtin': 1000,
} satisfies Record<DevToolsDockEntryCategory, number>

export type { DevToolsDocksUserSettings }
