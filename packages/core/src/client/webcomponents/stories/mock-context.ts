import type { DevToolsDockEntry, DevToolsDocksUserSettings } from '@vitejs/devtools-kit'
import type { DevToolsRpcClient, DockPanelStorage, DocksContext, RpcClientEvents } from '@vitejs/devtools-kit/client'
import { DEFAULT_STATE_USER_SETTINGS } from '@vitejs/devtools-kit/constants'
import { createEventEmitter } from 'devframe/utils/events'
import { createSharedState } from 'devframe/utils/shared-state'
import { ref } from 'vue'
import { createDocksContext } from '../state/context'
import { DEFAULT_DOCK_PANEL_STORE } from '../state/docks'

/**
 * A story-only RPC client. Backs the three shared-state keys the dock context
 * reads (`devframe:docks`, `devframe:user-settings`, `devframe:commands`) with
 * in-memory stores, stubs `call`, and exposes a mutable `isTrusted` you can flip
 * to exercise the unauthorized paths.
 */
export interface MockRpcClient extends DevToolsRpcClient {
  /** Flip the trust flag and emit `rpc:is-trusted:updated`, as the real WS client does. */
  setTrusted: (value: boolean) => void
}

export interface CreateMockContextOptions {
  /** Dock entries seeded into `devframe:docks`. */
  entries?: DevToolsDockEntry[]
  /** Which client shell the context represents. */
  clientType?: 'embedded' | 'standalone'
  /** Overrides merged over the default panel store (mode, position, open, ...). */
  panel?: Partial<DockPanelStorage>
  /** Overrides merged over the default user settings (hidden, pinned, order, ...). */
  settings?: Partial<DevToolsDocksUserSettings>
  /** Entry id to pre-select (also opens the panel). */
  selectedId?: string | null
  /** Initial trust state. Defaults to `true`. */
  isTrusted?: boolean
}

function createMockRpc(
  entries: DevToolsDockEntry[],
  settings: Partial<DevToolsDocksUserSettings>,
  initialTrusted: boolean,
): MockRpcClient {
  const docksState = createSharedState({ initialValue: entries, enablePatches: false })
  const settingsState = createSharedState({
    initialValue: { ...DEFAULT_STATE_USER_SETTINGS(), ...settings },
    enablePatches: false,
  })
  const commandsState = createSharedState({ initialValue: [] as any[], enablePatches: false })
  const events = createEventEmitter<RpcClientEvents>()

  let trusted = initialTrusted

  // Minimal RPC surface used by the composed shells (messages/toasts, command
  // palette). `call` returns empty-but-valid shapes for the methods those call.
  const call = async (method: string) => {
    if (method === 'devtoolskit:internal:messages:list')
      return { removedIds: [], entries: [], version: null }
    return undefined
  }

  const rpc = {
    events,
    get isTrusted() {
      return trusted
    },
    ensureTrusted: async () => trusted === true,
    requestTrust: async () => trusted === true,
    requestTrustWithCode: async () => trusted === true,
    requestTrustWithToken: async () => trusted === true,
    call,
    callEvent: async () => undefined,
    callOptional: async () => undefined,
    client: {
      // Register a client-side RPC handler; returns an unsubscribe.
      register: () => () => {},
    },
    sharedState: {
      get: async (key: string) => {
        if (key === 'devframe:docks')
          return docksState
        if (key === 'devframe:user-settings')
          return settingsState
        if (key === 'devframe:commands')
          return commandsState
        throw new Error(`[mock-rpc] Unexpected shared state key: ${key}`)
      },
    },
    setTrusted(value: boolean) {
      trusted = value
      events.emit('rpc:is-trusted:updated', value)
    },
  }

  return rpc as unknown as MockRpcClient
}

/**
 * Build a real {@link DocksContext} wired to an in-memory {@link MockRpcClient}.
 *
 * This is the same `createDocksContext` the client boots with, so grouping,
 * `switchEntry`, commands and when-clauses all behave exactly as they do at
 * runtime — only the transport is faked. Every call gets a fresh RPC instance,
 * so the per-rpc context cache never bleeds between stories.
 */
export async function createMockDocksContext(
  options: CreateMockContextOptions = {},
): Promise<DocksContext & { rpc: MockRpcClient }> {
  const {
    entries = [],
    clientType = 'embedded',
    panel,
    settings = {},
    selectedId = null,
    isTrusted = true,
  } = options

  const rpc = createMockRpc(entries, settings, isTrusted)
  const panelStore = ref<DockPanelStorage>({ ...DEFAULT_DOCK_PANEL_STORE(), ...panel })

  const context = await createDocksContext(clientType, rpc, panelStore)

  if (selectedId != null) {
    context.docks.selectedId = selectedId
    context.panel.store.open = true
  }

  return context as DocksContext & { rpc: MockRpcClient }
}
