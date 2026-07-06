import type { DevToolsDockEntry, DevToolsServerCommandEntry } from '@vitejs/devtools-kit'
import type { DockClientType, DockPanelStorage, DocksContext } from '@vitejs/devtools-kit/client'
import { ref } from 'vue'
import { createDocksContext } from '../../state/context'
import { DEFAULT_DOCK_PANEL_STORE } from '../../state/docks'
import { dockEntriesFixture, serverCommandsFixture } from './fixtures'
import { createMockRpcClient } from './mock-rpc'

export interface MockContextOptions {
  clientType?: DockClientType
  isTrusted?: boolean
  /** Dock entries to seed. Defaults to {@link dockEntriesFixture}. */
  entries?: DevToolsDockEntry[]
  /** Server commands to seed. Defaults to {@link serverCommandsFixture}. */
  serverCommands?: DevToolsServerCommandEntry[]
  /** Partial overrides merged onto the default panel storage. */
  panel?: Partial<DockPanelStorage>
  /** Dock entry id to select once the context is ready. */
  selectedId?: string | null
  /** Handlers for `rpc.call(id, ...)`, keyed by command/RPC id. */
  callHandlers?: Record<string, (...args: any[]) => unknown>
  /**
   * Extra shared-state values to seed beyond docks/commands — e.g. a
   * json-render spec keyed by the view's `_stateKey`.
   */
  sharedStates?: Record<string, unknown>
}

export interface MockContext {
  context: DocksContext
  rpc: ReturnType<typeof createMockRpcClient>
}

/**
 * Build a real {@link DocksContext} backed by a mock RPC client, seeded with
 * fixture dock entries and commands. Drives the production context factory so
 * stories exercise the same state code paths the app uses.
 */
export async function createMockDocksContext(options: MockContextOptions = {}): Promise<MockContext> {
  const {
    clientType = 'embedded',
    isTrusted = true,
    entries = dockEntriesFixture(),
    serverCommands = serverCommandsFixture(),
    panel = {},
    selectedId = null,
    callHandlers = {},
    sharedStates = {},
  } = options

  const rpc = createMockRpcClient({
    isTrusted,
    sharedStates: {
      'devframe:docks': entries,
      'devframe:commands': serverCommands,
      ...sharedStates,
    },
    callHandlers,
  })

  const panelStore = ref<DockPanelStorage>({
    ...DEFAULT_DOCK_PANEL_STORE(),
    ...panel,
  })

  const context = await createDocksContext(clientType, rpc, panelStore)

  if (selectedId != null)
    await context.docks.switchEntry(selectedId)

  return { context, rpc }
}
