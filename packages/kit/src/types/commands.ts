import type { EventEmitter } from './events'

// --- Keybinding ---

export interface DevToolsCommandKeybinding {
  /**
   * Keyboard shortcut string.
   * Use "Mod" for platform-aware modifier (Cmd on macOS, Ctrl elsewhere).
   * Examples: "Mod+K", "Mod+Shift+P", "Alt+N"
   */
  key: string
  /**
   * Optional context expression for conditional activation.
   * Examples: "clientType == embedded", "dockOpen", "!dockOpen"
   * Supports: ==, !=, &&, ||, bare truthy, ! negation
   */
  when?: string
}

// --- Command Entry ---

export interface DevToolsCommandBase {
  /**
   * Unique namespaced ID, e.g. "vite:open-in-editor"
   */
  id: string
  title: string
  description?: string
  /**
   * Iconify icon string, e.g. "ph:pencil-duotone"
   */
  icon?: string
  category?: string
  /**
   * Whether to show in command palette. Default: true
   */
  showInPalette?: boolean
  /**
   * Default keyboard shortcut(s) for this command
   */
  keybindings?: DevToolsCommandKeybinding[]
}

/**
 * Server command input — what plugins pass to `ctx.commands.register()`.
 */
export interface DevToolsServerCommandInput extends DevToolsCommandBase {
  /**
   * Handler for this command. Optional if the command only serves as a group for children.
   */
  handler?: (...args: any[]) => any | Promise<any>
  /**
   * Static sub-commands. Two levels max (parent → children).
   * Each child must have a globally unique `id`.
   */
  children?: DevToolsServerCommandInput[]
}

/**
 * Serializable server command entry — sent over RPC (no handler).
 */
export interface DevToolsServerCommandEntry extends DevToolsCommandBase {
  source: 'server'
  children?: DevToolsServerCommandEntry[]
}

/**
 * Client command — registered in the webcomponent context.
 */
export interface DevToolsClientCommand extends DevToolsCommandBase {
  source: 'client'
  /**
   * Action for this command. Optional if the command only serves as a group for children.
   * Return sub-commands for dynamic nested palette menus (runtime submenus).
   */
  action?: (...args: any[]) => void | DevToolsClientCommand[] | Promise<void | DevToolsClientCommand[]>
  /**
   * Static sub-commands. Two levels max (parent → children).
   */
  children?: DevToolsClientCommand[]
}

/**
 * Union of command entries visible in the palette.
 */
export type DevToolsCommandEntry = DevToolsServerCommandEntry | DevToolsClientCommand

// --- Server Host ---

export interface DevToolsCommandHandle {
  readonly id: string
  update: (patch: Partial<Omit<DevToolsServerCommandInput, 'id'>>) => void
  unregister: () => void
}

export interface DevToolsCommandsHostEvents {
  'command:registered': (command: DevToolsServerCommandEntry) => void
  'command:unregistered': (id: string) => void
}

export interface DevToolsCommandsHost {
  readonly commands: Map<string, DevToolsServerCommandInput>
  readonly events: EventEmitter<DevToolsCommandsHostEvents>

  /**
   * Register a command (with optional children).
   */
  register: (command: DevToolsServerCommandInput) => DevToolsCommandHandle

  /**
   * Unregister a command by ID (removes parent and all children).
   */
  unregister: (id: string) => boolean

  /**
   * Execute a command by ID. Searches top-level and children.
   * Throws if not found or if command has no handler.
   */
  execute: (id: string, ...args: any[]) => Promise<unknown>

  /**
   * Returns serializable list (no handlers), preserving tree structure.
   */
  list: () => DevToolsServerCommandEntry[]
}

// --- Shortcut Overrides (shared state) ---

export interface DevToolsCommandShortcutOverrides {
  /**
   * Command ID → keybinding overrides. Empty array = shortcut disabled.
   */
  [commandId: string]: DevToolsCommandKeybinding[]
}
