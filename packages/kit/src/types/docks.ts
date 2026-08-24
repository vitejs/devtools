import type { DevframeDockEntryCategory, DevframeViewLauncher } from '@devframes/hub/types'

export type { DockRendererRegistration } from '@devframes/hub/initiate'

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
  FrameSubTabsConfig as DevToolsFrameSubTabsConfig,
  NavTarget as DevToolsNavTarget,
  DevframeViewAction as DevToolsViewAction,
  DevframeViewBuiltin as DevToolsViewBuiltin,
  DevframeViewCustomRender as DevToolsViewCustomRender,
  DevframeViewGroup as DevToolsViewGroup,
  DevframeViewIframe as DevToolsViewIframe,
  DevframeViewLauncherStatus as DevToolsViewLauncherStatus,
  RemoteConnectionInfo,
  RemoteDockOptions,
} from '@devframes/hub/types'

// `json-render` is the opt-in `@devframes/json-render` integration, which
// contributes the `'json-render'` variant to the hub's open dock union (its
// entry carries a serializable `view` ref). Re-export that entry type under
// the kit's `DevTools*` naming; the type-only re-export also pulls in the
// module augmentation so `docks.register({ type: 'json-render' })` resolves
// for kit consumers. The `@devframes/json-render-ui` renderer, mounted by
// Vite DevTools via `initHub({ renderers })`, reads `entry.view`.
export type { DevframeJsonRenderDockEntry as DevToolsViewJsonRender } from '@devframes/json-render/hub'

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
 * under a dedicated dock group (see `'viteplus'`) rather than
 * a category, so this mirrors hub's framework-neutral set directly.
 */
export type DevToolsDockEntryCategory = DevframeDockEntryCategory
