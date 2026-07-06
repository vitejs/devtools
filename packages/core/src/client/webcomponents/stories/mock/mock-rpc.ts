import type { DevToolsRpcClient } from '@vitejs/devtools-kit/client'
import type { SharedState } from 'devframe/utils/shared-state'
import { createEventEmitter } from 'devframe/utils/events'
import { createSharedState } from 'devframe/utils/shared-state'

export interface MockRpcOptions {
  /**
   * Whether the client is trusted. Set `false` to preview the client-auth
   * notice surfaces.
   * @default true
   */
  isTrusted?: boolean
  /**
   * Pre-seeded shared-state values, keyed by shared-state key
   * (e.g. `'devframe:docks'`, `'devframe:commands'`).
   */
  sharedStates?: Record<string, unknown>
  /**
   * Handlers for server RPC calls (`rpc.call(id, ...args)`), keyed by id.
   * Unmatched ids resolve to `undefined`.
   */
  callHandlers?: Record<string, (...args: any[]) => unknown>
}

/**
 * An in-memory {@link DevToolsRpcClient} for Storybook and tests.
 *
 * Backs `sharedState.get()` with real {@link createSharedState} stores so the
 * production state factories (`createDocksContext`, `createCommandsContext`, …)
 * run unmodified against it. Network-only surfaces (`streaming`, `cacheManager`,
 * trust negotiation) are stubbed to no-ops.
 */
export function createMockRpcClient(options: MockRpcOptions = {}): DevToolsRpcClient {
  const {
    isTrusted = true,
    sharedStates = {},
    callHandlers = {},
  } = options

  const events = createEventEmitter<{ 'rpc:is-trusted:updated': (isTrusted: boolean) => void }>()
  const stateStore = new Map<string, SharedState<any>>()
  const keyAddedListeners = new Set<(key: string) => void>()

  // Pre-seed the provided shared states so consumers see them on first `get`.
  for (const [key, value] of Object.entries(sharedStates)) {
    stateStore.set(key, createSharedState({ initialValue: value as object }))
  }

  const sharedState: DevToolsRpcClient['sharedState'] = {
    get: (async (key: string, opts?: { initialValue?: unknown }) => {
      const existing = stateStore.get(key)
      if (existing)
        return existing
      const created = createSharedState({ initialValue: (opts?.initialValue ?? {}) as object })
      stateStore.set(key, created)
      for (const fn of keyAddedListeners) fn(key)
      return created
    }) as DevToolsRpcClient['sharedState']['get'],
    keys: () => [...stateStore.keys()],
    onKeyAdded: (fn: (key: string) => void) => {
      keyAddedListeners.add(fn)
      return () => keyAddedListeners.delete(fn)
    },
  }

  // Safe defaults for the internal list endpoints so the messages/terminals
  // state factories never choke on an undefined response. Overridable per story
  // via `callHandlers`.
  const defaultCallResults: Record<string, () => unknown> = {
    'devtoolskit:internal:messages:list': () => ({ removedIds: [], entries: [], version: 0 }),
    'devtoolskit:internal:terminals:list': () => [],
  }

  const call = (async (id: string, ...args: any[]) => {
    if (callHandlers[id])
      return callHandlers[id](...args)
    return defaultCallResults[id]?.()
  }) as DevToolsRpcClient['call']

  return {
    events: events as DevToolsRpcClient['events'],
    isTrusted,
    connectionMeta: {} as DevToolsRpcClient['connectionMeta'],
    ensureTrusted: async () => isTrusted,
    requestTrust: async () => isTrusted,
    requestTrustWithToken: async () => isTrusted,
    call,
    callEvent: (() => {}) as unknown as DevToolsRpcClient['callEvent'],
    callOptional: (async () => undefined) as unknown as DevToolsRpcClient['callOptional'],
    // `client.register` lets consumers (messages/terminals) attach client-side
    // RPC handlers. Stories never invoke them, so registration is a no-op.
    client: {
      register: () => () => {},
    } as unknown as DevToolsRpcClient['client'],
    sharedState,
    streaming: {
      // A benign reader that ends immediately — consumers' `for await` loops
      // complete without receiving chunks (stories seed output via the
      // `terminals:read` call handler instead of a live stream).
      subscribe: () => ({
        async* [Symbol.asyncIterator]() {},
        readable: new ReadableStream(),
      }),
      upload: () => {
        throw new Error('[mock-rpc] streaming.upload is not implemented')
      },
    } as unknown as DevToolsRpcClient['streaming'],
    cacheManager: {} as DevToolsRpcClient['cacheManager'],
  }
}
