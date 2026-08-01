import type { DevToolsCommandEntry, DevToolsCommandKeybinding } from '@vitejs/devtools-kit'
import type { WhenContext } from 'devframe/utils/when'
import { evaluateWhen } from 'devframe/utils/when'

export type { WhenContext } from 'devframe/utils/when'
export { evaluateWhen, resolveContextValue } from 'devframe/utils/when'

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

export function areKeybindingsEqual(
  left: DevToolsCommandKeybinding[] | undefined,
  right: DevToolsCommandKeybinding[] | undefined,
): boolean {
  const leftBindings = left ?? []
  const rightBindings = right ?? []
  return leftBindings.length === rightBindings.length
    && leftBindings.every((binding, index) => binding.key === rightBindings[index]?.key)
}

export function isKeybindingOverrideDifferentFromDefault(
  override: DevToolsCommandKeybinding[] | undefined,
  defaults: DevToolsCommandKeybinding[] | undefined,
): boolean {
  return override !== undefined && !areKeybindingsEqual(override, defaults)
}

/**
 * Drop the commands whose `when` clause does not hold in the current context,
 * children included — `when` is documented to control palette visibility, but
 * nothing evaluated it for nested entries.
 *
 * A parent that survives is shallow-cloned so its `children` can be narrowed
 * without mutating the registry. Callers therefore get fresh parent objects on
 * every call: match entries by `id`, never by reference.
 */
export function filterCommandsByWhen(
  commands: DevToolsCommandEntry[],
  ctx: WhenContext,
): DevToolsCommandEntry[] {
  const isAvailable = (cmd: { when?: string }) => !cmd.when || evaluateWhen(cmd.when, ctx)

  const result: DevToolsCommandEntry[] = []
  for (const cmd of commands) {
    if (!isAvailable(cmd))
      continue
    if (!cmd.children) {
      result.push(cmd)
      continue
    }
    // `children` is typed `Server[] | Client[]` rather than `(Server | Client)[]`,
    // so filtering it in place widens the element type — same cast the other
    // child-walking call sites use.
    const children = (cmd.children as DevToolsCommandEntry[]).filter(isAvailable)
    result.push({ ...cmd, children } as DevToolsCommandEntry)
  }
  return result
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
