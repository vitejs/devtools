import type { DevframeDockEntryCategory, DevframeViewLauncher } from '@devframes/hub/types'

export type {
  ClientScriptEntry,
  DevframeDockActivation as DevToolsDockActivation,
  DevframeDockEntriesGrouped as DevToolsDockEntriesGrouped,
  DevframeDockEntry as DevToolsDockEntry,
  DevframeDockEntryBase as DevToolsDockEntryBase,
  DevframeDockEntryIcon as DevToolsDockEntryIcon,
  DevframeDocksHost as DevToolsDockHost,
  DevframeDocksActiveState as DevToolsDocksActiveState,
  DevframeDockUserEntry as DevToolsDockUserEntry,
  DevframeViewAction as DevToolsViewAction,
  DevframeViewBuiltin as DevToolsViewBuiltin,
  DevframeViewCustomRender as DevToolsViewCustomRender,
  DevframeViewGroup as DevToolsViewGroup,
  DevframeViewIframe as DevToolsViewIframe,
  DevframeViewJsonRender as DevToolsViewJsonRender,
  DevframeViewLauncherStatus as DevToolsViewLauncherStatus,
  RemoteConnectionInfo,
  RemoteDockOptions,
} from '@devframes/hub/types'

/**
 * A selectable launch root offered by a launcher dock entry.
 *
 * When a launcher supplies {@link DevToolsViewLauncher.launcher.roots}, the
 * viewer renders a picker above the launch button. The selected root's
 * {@link DevToolsLaunchRoot.value} is forwarded to the launch as `{ root }`,
 * where a `createProcessLauncher` uses it as the spawned process's `cwd`.
 */
export interface DevToolsLaunchRoot {
  /** Absolute path forwarded as the spawn `cwd` when this root is selected. */
  value: string
  /** Human-friendly label shown in the picker (e.g. `Workspace root`). */
  label: string
  /** Optional secondary line, e.g. the path itself. */
  description?: string
}

/**
 * Payload carried from the client launch action to the bound launch command.
 */
export interface DevToolsLaunchPayload {
  /** The {@link DevToolsLaunchRoot.value} of the root the user selected. */
  root?: string
}

/**
 * Kit augmentation of hub's launcher entry: adds optional selectable launch
 * {@link DevToolsViewLauncher.launcher.roots | roots}.
 *
 * Docks belong to `@devframes/hub`; this extends the upstream launcher shape
 * locally until the field lands there. Since `roots` is optional, a plain hub
 * `DevframeViewLauncher` remains assignable to this type.
 */
export interface DevToolsViewLauncher extends DevframeViewLauncher {
  launcher: DevframeViewLauncher['launcher'] & {
    /**
     * Selectable launch roots, owner-populated via `docks.update()`. When
     * present the viewer renders a picker; the chosen root's `value` is
     * forwarded to the launch command as {@link DevToolsLaunchPayload}.
     */
    roots?: DevToolsLaunchRoot[]
  }
}

/**
 * The kit's dock-entry category union. Vite Plus integrations are collected
 * under a dedicated dock group (see `DEVTOOLS_VITEPLUS_GROUP_ID`) rather than
 * a category, so this mirrors hub's framework-neutral set directly.
 */
export type DevToolsDockEntryCategory = DevframeDockEntryCategory
