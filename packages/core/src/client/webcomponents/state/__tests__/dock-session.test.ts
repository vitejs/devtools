import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DevToolsRpcClient } from '@vitejs/devtools-kit/client'
import type { Ref } from 'vue'
import { DEFAULT_STATE_USER_SETTINGS } from '@vitejs/devtools-kit/constants'
import { createSharedState } from 'devframe/utils/shared-state'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { createDocksContext } from '../context'

// Stands in for the real `useSessionStorage` (browser `sessionStorage`,
// unavailable in this Node test environment) with an in-memory ref keyed the
// same way, so tests can pre-seed "what a reload restored" and assert what
// `createDocksContext` writes back — without touching real browser storage.
const mocks = vi.hoisted(() => ({
  sessionStores: new Map<string, Ref<any>>(),
}))

vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal<typeof import('@vueuse/core')>()),
  useSessionStorage: vi.fn((key: string, defaults: unknown) => {
    if (!mocks.sessionStores.has(key))
      mocks.sessionStores.set(key, ref(defaults))
    return mocks.sessionStores.get(key)
  }),
}))

function createMockRpc(entries: DevToolsDockEntry[] = []): DevToolsRpcClient {
  const docksState = createSharedState({ initialValue: entries, enablePatches: false })
  const settingsState = createSharedState({ initialValue: DEFAULT_STATE_USER_SETTINGS(), enablePatches: false })
  const commandsState = createSharedState({ initialValue: [] as any[], enablePatches: false })

  return {
    client: { register: () => () => {} },
    sharedState: {
      get: async (key: string) => {
        if (key === 'devframe:docks')
          return docksState as any
        if (key === 'devframe:user-settings')
          return settingsState as any
        if (key === 'devframe:commands')
          return commandsState as any
        throw new Error(`Unexpected shared state key: ${key}`)
      },
    },
  } as unknown as DevToolsRpcClient
}

function iframe(id: string, extra: Partial<DevToolsDockEntry> = {}): DevToolsDockEntry {
  return { id, type: 'iframe', url: '/', title: id, icon: 'i', ...extra } as DevToolsDockEntry
}

function group(id: string): DevToolsDockEntry {
  return { id, type: 'group', title: id, icon: 'i' } as DevToolsDockEntry
}

function seedSession(selectedId: string | null, open = true) {
  mocks.sessionStores.set('vite-devtools-dock-session', ref({ open, selectedId }))
}

describe('session-scoped dock state', () => {
  afterEach(() => {
    mocks.sessionStores.clear()
  })

  it('keeps a restored selectedId that resolves to a real leaf entry', async () => {
    seedSession('a')
    const context = await createDocksContext('embedded', createMockRpc([iframe('a')]))

    expect(context.docks.selectedId).toBe('a')
    expect(context.panel.store.open).toBe(true)
  })

  it('keeps a restored selectedId of the ~client-auth-notice pseudo-entry', async () => {
    seedSession('~client-auth-notice')
    const context = await createDocksContext('embedded', createMockRpc([]))

    expect(context.docks.selectedId).toBe('~client-auth-notice')
  })

  it('clears a restored selectedId pointing at a group (not a selectable leaf)', async () => {
    seedSession('nuxt-group')
    const context = await createDocksContext('embedded', createMockRpc([group('nuxt-group')]))

    expect(context.docks.selectedId).toBeNull()
  })

  it('clears a restored selectedId pointing at a subTabs anchor (not a selectable leaf)', async () => {
    seedSession('nuxt')
    const context = await createDocksContext('embedded', createMockRpc([iframe('nuxt', { subTabs: { protocol: 'postmessage' } })]))

    expect(context.docks.selectedId).toBeNull()
  })

  it('clears a restored selectedId that no longer resolves to any entry, without forcing the panel open', async () => {
    seedSession('gone', false)
    const context = await createDocksContext('embedded', createMockRpc([iframe('a')]))

    expect(context.docks.selectedId).toBeNull()
    // Clearing an invalid restored id must not route through `switchEntry`
    // (which would force `open = true`) — the panel stays exactly as restored.
    expect(context.panel.store.open).toBe(false)
  })

  it('does not clear an id `switchEntry` itself legitimately selects later (a subTabs anchor with no live member yet)', async () => {
    const context = await createDocksContext('embedded', createMockRpc([iframe('nuxt', { subTabs: { protocol: 'postmessage' } })]))

    await context.docks.switchEntry('nuxt')

    expect(context.docks.selectedId).toBe('nuxt')
  })

  it('routes panel.store.open through the session store, not the geometry ref passed in', async () => {
    const geometry = ref({ mode: 'float' as const, width: 80, height: 80, top: 0, left: 0, position: 'left' as const, inactiveTimeout: 3_000 })
    const context = await createDocksContext('embedded', createMockRpc([]), geometry)

    context.panel.store.open = true

    expect(context.panel.store.open).toBe(true)
    expect(geometry.value).not.toHaveProperty('open')
  })

  it('still routes panel.store geometry fields (e.g. mode) through the passed-in geometry ref', async () => {
    const geometry = ref({ mode: 'float' as const, width: 80, height: 80, top: 0, left: 0, position: 'left' as const, inactiveTimeout: 3_000 })
    const context = await createDocksContext('embedded', createMockRpc([]), geometry)

    context.panel.store.mode = 'edge'

    expect(geometry.value.mode).toBe('edge')
  })
})
