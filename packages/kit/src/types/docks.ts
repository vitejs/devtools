import type {
  DevframeDockEntryCategory,
  DevframeViewAction,
  DevframeViewBuiltin,
  DevframeViewCustomRender,
  DevframeViewGroup,
  DevframeViewIframe,
  DevframeViewJsonRender,
  DevframeViewLauncher,
} from '@devframes/hub/types'

export type {
  ClientScriptEntry,
  DevframeDockActivation as DevToolsDockActivation,
  DevframeDockEntriesGrouped as DevToolsDockEntriesGrouped,
  DevframeDockEntryBase as DevToolsDockEntryBase,
  DevframeDockEntryIcon as DevToolsDockEntryIcon,
  DevframeDocksHost as DevToolsDockHost,
  DevframeDocksActiveState as DevToolsDocksActiveState,
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
 * Kit-side additions to the hub launcher view — a deliberate downstream shim
 * (pending upstream promotion into `@devframes/hub`'s launcher type) that turns
 * a launcher into a small process-control card:
 *
 * - {@link command} links the launcher to a registered command, so the same
 *   action fires from the launch button, the command palette, and any
 *   keybinding.
 * - {@link terminalSessionId} ties the launcher to a terminal session, powering
 *   the "View in Terminal" navigation (via `hub:docks:activate`) and the digest.
 * - {@link digest} is the latest line of progress from that session, surfaced
 *   inline on the card.
 *
 * All three are optional and serializable, so they ride the existing
 * `devframe:docks` shared-state sync to the client untouched.
 */
export interface DevToolsLauncherExtras {
  /**
   * Id of a command (registered via the commands host) this launcher is bound
   * to. The client surfaces the command's keybinding next to the launch button;
   * wire `launcher.onLaunch` to `ctx.commands.execute(command)` so the button,
   * palette, and keybinding all run one handler.
   */
  command?: string
  /**
   * Id of the terminal session this launcher tracks. Enables the "View in
   * Terminal" affordance, which asks the host shell to activate the Terminals
   * dock focused on this session.
   */
  terminalSessionId?: string
  /**
   * Latest line of progress from the tracked terminal session. Push updates via
   * `ctx.docks.update(...)`; {@link createLineDigest} extracts it from output.
   */
  digest?: string
}

/**
 * The kit's launcher view — hub's {@link DevframeViewLauncher} with the extra
 * {@link DevToolsLauncherExtras} folded into the `launcher` payload.
 */
export interface DevToolsViewLauncher extends Omit<DevframeViewLauncher, 'launcher'> {
  launcher: DevframeViewLauncher['launcher'] & DevToolsLauncherExtras
}

/**
 * The kit's dock-entry union. Identical to hub's set, except the launcher
 * member carries {@link DevToolsLauncherExtras}. Structurally interchangeable
 * with hub's `DevframeDockUserEntry` (the extras are optional), so entries flow
 * through the hub `register`/`update`/`values` machinery unchanged.
 */
export type DevToolsDockUserEntry
  = | DevframeViewIframe
    | DevframeViewAction
    | DevframeViewCustomRender
    | DevToolsViewLauncher
    | DevframeViewJsonRender
    | DevframeViewGroup
    | DevframeViewBuiltin

export type DevToolsDockEntry = DevToolsDockUserEntry

/**
 * The kit's dock-entry category union. Vite Plus integrations are collected
 * under a dedicated dock group (see `DEVTOOLS_VITEPLUS_GROUP_ID`) rather than
 * a category, so this mirrors hub's framework-neutral set directly.
 */
export type DevToolsDockEntryCategory = DevframeDockEntryCategory
