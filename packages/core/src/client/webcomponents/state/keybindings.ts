import type { DevToolsCommandEntry, DevToolsCommandKeybinding } from '@vitejs/devtools-kit'

// Re-export when utilities from kit
export type { WhenContext } from '@vitejs/devtools-kit'
export { evaluateWhen, getContextValue } from '@vitejs/devtools-kit/utils/when'

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform ?? '')

export function formatKeybinding(key: string): string[] {
  return key.split('+').map((part) => {
    if (part === 'Mod')
      return isMac ? '\u2318' : 'Ctrl'
    if (part === 'Shift')
      return isMac ? '\u21E7' : 'Shift'
    if (part === 'Alt')
      return isMac ? '\u2325' : 'Alt'
    return part
  })
}

export function normalizeKeyEvent(e: KeyboardEvent): string {
  const parts: string[] = []
  if (isMac ? e.metaKey : e.ctrlKey)
    parts.push('Mod')
  if (isMac ? e.ctrlKey : e.metaKey)
    parts.push(isMac ? 'Ctrl' : 'Meta')
  if (e.altKey)
    parts.push('Alt')
  if (e.shiftKey)
    parts.push('Shift')

  // Normalize key name
  let key = e.key
  if (key.length === 1)
    key = key.toUpperCase()

  // Don't add modifier keys as the main key
  if (!['Control', 'Meta', 'Alt', 'Shift'].includes(key))
    parts.push(key)

  return parts.join('+')
}

export function collectAllKeybindings(
  commands: { value: DevToolsCommandEntry[] },
  getKeybindings: (id: string) => DevToolsCommandKeybinding[],
): Array<{ id: string, keybinding: DevToolsCommandKeybinding }> {
  const result: Array<{ id: string, keybinding: DevToolsCommandKeybinding }> = []

  for (const cmd of commands.value) {
    for (const kb of getKeybindings(cmd.id)) {
      result.push({ id: cmd.id, keybinding: kb })
    }
    // Also collect from children
    if (cmd.children) {
      for (const child of cmd.children) {
        for (const kb of getKeybindings(child.id)) {
          result.push({ id: child.id, keybinding: kb })
        }
      }
    }
  }

  return result
}

export const KNOWN_BROWSER_SHORTCUTS: Record<string, string> = {
  'Mod+T': 'Open new tab',
  'Mod+W': 'Close tab',
  'Mod+N': 'Open new window',
  'Mod+L': 'Focus address bar',
  'Mod+D': 'Bookmark page',
  'Mod+Q': 'Quit browser',
  'Mod+Shift+T': 'Reopen closed tab',
  'Mod+Shift+N': 'Open incognito window',
  'Mod+Shift+W': 'Close window',
  'Mod+Shift+Q': 'Quit browser (Chrome)',
  'Alt+F4': 'Close window (Windows)',
  'Mod+R': 'Reload page',
  'Mod+Shift+R': 'Hard reload page',
  'Mod+F': 'Find in page',
}
