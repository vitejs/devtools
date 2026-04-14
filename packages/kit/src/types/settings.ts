import type { DevToolsCommandShortcutOverrides } from './commands'

export interface DevToolsDocksUserSettings {
  docksHidden: string[]
  docksCategoriesHidden: string[]
  docksPinned: string[]
  docksCustomOrder: Record<string, number>
  showIframeAddressBar: boolean
  closeOnOutsideClick: boolean
  commandShortcuts: DevToolsCommandShortcutOverrides
}
