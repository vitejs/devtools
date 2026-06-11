import type { DevframeDockEntryCategory } from '@devframes/hub/types'

export type {
  ClientScriptEntry,
  DevframeDockEntriesGrouped as DevToolsDockEntriesGrouped,
  DevframeDockEntry as DevToolsDockEntry,
  DevframeDockEntryBase as DevToolsDockEntryBase,
  DevframeDockEntryIcon as DevToolsDockEntryIcon,
  DevframeDocksHost as DevToolsDockHost,
  DevframeDockUserEntry as DevToolsDockUserEntry,
  DevframeViewAction as DevToolsViewAction,
  DevframeViewBuiltin as DevToolsViewBuiltin,
  DevframeViewCustomRender as DevToolsViewCustomRender,
  DevframeViewGroup as DevToolsViewGroup,
  DevframeViewIframe as DevToolsViewIframe,
  DevframeViewJsonRender as DevToolsViewJsonRender,
  DevframeViewLauncher as DevToolsViewLauncher,
  DevframeViewLauncherStatus as DevToolsViewLauncherStatus,
  RemoteConnectionInfo,
  RemoteDockOptions,
} from '@devframes/hub/types'

/**
 * The kit's dock-entry category union extends hub's framework-neutral set
 * with the Vite-specific `~viteplus` slot used by Vite DevTools to group
 * Vite Plus integrations above the default categories.
 */
export type DevToolsDockEntryCategory = DevframeDockEntryCategory | '~viteplus'
