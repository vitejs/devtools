import type { DevToolsClientCommand, DevToolsCommandEntry, DevToolsCommandKeybinding, DevToolsCommandShortcutOverrides, DevToolsServerCommandEntry } from '@vitejs/devtools-kit'
import type { CommandsContext, DevToolsRpcClient } from '@vitejs/devtools-kit/client'
import type { ShallowRef } from 'vue'
import type { WhenContext } from './keybindings'
import { computed, markRaw, reactive, ref } from 'vue'
import { sharedStateToRef } from './docks'
import { collectAllKeybindings, evaluateWhen, normalizeKeyEvent } from './keybindings'

export { formatKeybinding, isMac, normalizeKeyEvent } from './keybindings'

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
