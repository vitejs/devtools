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
 * The kit's dock-entry category union. Vite Plus integrations are collected
 * under a dedicated dock group (see `DEVTOOLS_VITEPLUS_GROUP_ID`) rather than
 * a category, so this mirrors hub's framework-neutral set directly.
 */
export type DevToolsDockEntryCategory = DevframeDockEntryCategory
