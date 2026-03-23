import type { DevToolsClientCommand, DevToolsCommandEntry, DevToolsCommandKeybinding, DevToolsCommandShortcutOverrides, DevToolsServerCommandEntry } from '@vitejs/devtools-kit'
import type { CommandsContext, DevToolsRpcClient } from '@vitejs/devtools-kit/client'
import type { ShallowRef } from 'vue'
import { computed, markRaw, reactive, ref } from 'vue'
import { sharedStateToRef } from './docks'

const commandsContextByRpc = new WeakMap<DevToolsRpcClient, CommandsContext>()

export async function createCommandsContext(
  clientType: 'embedded' | 'standalone',
  rpc: DevToolsRpcClient,
): Promise<CommandsContext> {
  if (commandsContextByRpc.has(rpc)) {
    return commandsContextByRpc.get(rpc)!
  }

  // Server commands from shared state
  const serverCommandsState = await rpc.sharedState.get('devtoolskit:internal:commands', { initialValue: [] })
  const serverCommands: ShallowRef<DevToolsServerCommandEntry[]> = sharedStateToRef(serverCommandsState)

  // Client commands (local registry)
  const clientCommands = reactive(new Map<string, DevToolsClientCommand>())

  // Shortcut overrides
  const shortcutOverridesState = await rpc.sharedState.get('devtoolskit:internal:command-shortcuts', { initialValue: {} })
  const shortcutOverrides = sharedStateToRef(shortcutOverridesState)

  const paletteOpen = ref(false)

  // Merged commands
  const commands = computed<DevToolsCommandEntry[]>(() => [
    ...serverCommands.value,
    ...Array.from(clientCommands.values()),
  ])

  const paletteCommands = computed<DevToolsCommandEntry[]>(() =>
    commands.value.filter(cmd => cmd.showInPalette !== false),
  )

  function register(cmd: DevToolsClientCommand | DevToolsClientCommand[]): () => void {
    const cmds = Array.isArray(cmd) ? cmd : [cmd]
    for (const c of cmds) {
      clientCommands.set(c.id, c)
    }
    return () => {
      for (const c of cmds) {
        clientCommands.delete(c.id)
      }
    }
  }

  function findCommand(id: string): DevToolsCommandEntry | undefined {
    // Search top-level
    const topLevel = commands.value.find(c => c.id === id)
    if (topLevel)
      return topLevel

    // Search children
    for (const cmd of commands.value) {
      if (cmd.children) {
        const child = cmd.children.find(c => c.id === id)
        if (child)
          return child as DevToolsCommandEntry
      }
    }
    return undefined
  }

  async function execute(id: string, ...args: any[]): Promise<unknown> {
    const cmd = findCommand(id)
    if (!cmd) {
      throw new Error(`Command "${id}" not found`)
    }

    if (cmd.source === 'server') {
      return rpc.call('devtoolskit:internal:commands:execute', id, ...args)
    }

    // Client command
    if (cmd.action) {
      return cmd.action(...args)
    }

    throw new Error(`Command "${id}" has no action`)
  }

  function getKeybindings(id: string): DevToolsCommandKeybinding[] {
    const overrides = shortcutOverrides.value[id]
    if (overrides !== undefined)
      return overrides

    const cmd = findCommand(id)
    return cmd?.keybindings ?? []
  }

  // Keyboard shortcut listener
  if (typeof window !== 'undefined') {
    setupShortcutListener(clientType, commands, shortcutOverrides, getKeybindings, execute, paletteOpen)
  }

  const commandsContext: CommandsContext = reactive({
    commands,
    paletteCommands,
    register,
    execute,
    getKeybindings,
    shortcutOverrides: markRaw(shortcutOverridesState),
    paletteOpen,
  })

  commandsContextByRpc.set(rpc, commandsContext)
  return commandsContext
}

// --- Shortcut system ---

interface WhenContext {
  clientType: 'embedded' | 'standalone'
  dockOpen: boolean
  paletteOpen: boolean
}

function evaluateWhen(expression: string, ctx: WhenContext): boolean {
  // Simple expression evaluator: supports ==, !=, &&, ||, !, bare truthy
  const parts = expression.split('||').map(s => s.trim())
  return parts.some((orPart) => {
    const andParts = orPart.split('&&').map(s => s.trim())
    return andParts.every((part) => {
      const trimmed = part.trim()

      // Negation
      if (trimmed.startsWith('!')) {
        const key = trimmed.slice(1).trim()
        return !getContextValue(key, ctx)
      }

      // Equality/inequality
      const eqIdx = trimmed.indexOf('==')
      const neqIdx = trimmed.indexOf('!=')
      if (eqIdx !== -1 || neqIdx !== -1) {
        const isNeq = neqIdx !== -1 && (eqIdx === -1 || neqIdx < eqIdx)
        const opIdx = isNeq ? neqIdx : eqIdx
        const opLen = isNeq ? 2 : 2
        const key = trimmed.slice(0, opIdx).trim()
        const value = trimmed.slice(opIdx + opLen).trim()
        const actual = String(getContextValue(key, ctx))
        return isNeq ? actual !== value : actual === value
      }

      // Bare truthy
      return !!getContextValue(trimmed, ctx)
    })
  })
}

function getContextValue(key: string, ctx: WhenContext): unknown {
  return (ctx as unknown as Record<string, unknown>)[key]
}

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

function collectAllKeybindings(
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

function setupShortcutListener(
  clientType: 'embedded' | 'standalone',
  commands: { value: DevToolsCommandEntry[] },
  shortcutOverrides: ShallowRef<DevToolsCommandShortcutOverrides>,
  getKeybindings: (id: string) => DevToolsCommandKeybinding[],
  execute: (id: string, ...args: any[]) => Promise<unknown>,
  paletteOpen: { value: boolean },
) {
  const handler = (e: KeyboardEvent) => {
    const pressed = normalizeKeyEvent(e)
    if (!pressed || pressed === 'Mod' || pressed === 'Shift' || pressed === 'Alt')
      return

    const whenCtx: WhenContext = {
      clientType,
      dockOpen: false, // Will be connected when integrated with DocksContext
      paletteOpen: paletteOpen.value,
    }

    const allBindings = collectAllKeybindings(commands, getKeybindings)

    for (const { id, keybinding } of allBindings) {
      if (keybinding.key !== pressed)
        continue
      if (keybinding.when && !evaluateWhen(keybinding.when, whenCtx))
        continue

      e.preventDefault()
      e.stopPropagation()
      execute(id).catch(console.error)
      return
    }
  }

  // Attach to window — works for both embedded (shadow DOM) and standalone
  window.addEventListener('keydown', handler, { capture: true })
}
