import type { DevToolsClientCommand, DevToolsCommandEntry, DevToolsCommandKeybinding, DevToolsServerCommandEntry } from '@vitejs/devtools-kit'
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
  whenContextProvider?: () => WhenContext,
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

  const getWhenContext = (): WhenContext => {
    if (whenContextProvider)
      return whenContextProvider()
    return {
      clientType,
      dockOpen: false,
      paletteOpen: paletteOpen.value,
      dockSelectedId: '',
    }
  }

  // Merged commands
  const commands = computed<DevToolsCommandEntry[]>(() => [
    ...serverCommands.value,
    ...Array.from(clientCommands.values()),
  ])

  const paletteCommands = computed<DevToolsCommandEntry[]>(() => {
    const ctx = getWhenContext()
    return commands.value.filter((cmd) => {
      if (cmd.showInPalette === false)
        return false
      if (cmd.when && !evaluateWhen(cmd.when, ctx))
        return false
      return true
    })
  })

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

    // Check command-level when clause
    if (cmd.when) {
      const ctx = getWhenContext()
      if (!evaluateWhen(cmd.when, ctx)) {
        throw new Error(`Command "${id}" is not available in the current context`)
      }
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
    setupShortcutListener(getWhenContext, commands, getKeybindings, execute)
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
  getWhenContext: () => WhenContext,
  commands: { value: DevToolsCommandEntry[] },
  getKeybindings: (id: string) => DevToolsCommandKeybinding[],
  execute: (id: string, ...args: any[]) => Promise<unknown>,
) {
  const handler = (e: KeyboardEvent) => {
    const pressed = normalizeKeyEvent(e)
    if (!pressed || pressed === 'Mod' || pressed === 'Shift' || pressed === 'Alt')
      return

    const whenCtx = getWhenContext()
    const allBindings = collectAllKeybindings(commands, getKeybindings)

    for (const { id, keybinding } of allBindings) {
      if (keybinding.key !== pressed)
        continue
      // Check keybinding-level when clause
      if (keybinding.when && !evaluateWhen(keybinding.when, whenCtx))
        continue
      // Check command-level when clause
      const cmd = commands.value.find(c => c.id === id)
        ?? commands.value.flatMap(c => c.children ?? []).find(c => c.id === id)
      if (cmd?.when && !evaluateWhen(cmd.when, whenCtx))
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
