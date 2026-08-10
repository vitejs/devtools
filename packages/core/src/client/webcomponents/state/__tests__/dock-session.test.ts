import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DevToolsRpcClient } from '@vitejs/devtools-kit/client'
import type { Ref } from 'vue'
import type { DevToolsDockPanelStorage } from '../docks'
import { DEFAULT_STATE_USER_SETTINGS } from '@vitejs/devtools-kit/constants'
import { createSharedState } from 'devframe/utils/shared-state'
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { createDocksContext } from '../context'
import { DEFAULT_DOCK_PANEL_STORE } from '../docks'

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

// `open`/`selectedId` are now plain fields on the same `panelStore` ref
// `createDocksContext` is handed (`vite-devtools-dock-state`, localStorage in
// the real client) — no separate session store to mock, seed the ref directly.
function panelStore(selectedId: string | null, open = true): Ref<DevToolsDockPanelStorage> {
  return ref({ ...DEFAULT_DOCK_PANEL_STORE(), open, selectedId })
}

describe('restored dock panel state (selectedId/open on the same panelStore ref)', () => {
  it('keeps a restored selectedId that resolves to a real leaf entry', async () => {
    expect.assertions(2)

    const context = await createDocksContext('embedded', createMockRpc([iframe('a')]), panelStore('a'))

    expect(context.docks.selectedId).toBe('a')
    expect(context.panel.store.open).toBe(true)
  })

  it('keeps a restored selectedId of the ~client-auth-notice pseudo-entry', async () => {
    expect.assertions(1)

    const context = await createDocksContext('embedded', createMockRpc([]), panelStore('~client-auth-notice'))

    expect(context.docks.selectedId).toBe('~client-auth-notice')
  })

  it('clears a restored selectedId pointing at a group (not a selectable leaf)', async () => {
    expect.assertions(1)

    const context = await createDocksContext('embedded', createMockRpc([group('nuxt-group')]), panelStore('nuxt-group'))

    expect(context.docks.selectedId).toBeNull()
  })

  it('clears a restored selectedId pointing at a subTabs anchor (not a selectable leaf)', async () => {
    expect.assertions(1)

    const context = await createDocksContext(
      'embedded',
      createMockRpc([iframe('nuxt', { subTabs: { protocol: 'postmessage' } })]),
      panelStore('nuxt'),
    )

    expect(context.docks.selectedId).toBeNull()
  })

  it('clears a restored selectedId that no longer resolves to any entry, without forcing the panel open', async () => {
    expect.assertions(2)

    const context = await createDocksContext('embedded', createMockRpc([iframe('a')]), panelStore('gone', false))

    expect(context.docks.selectedId).toBeNull()
    // Clearing an invalid restored id must not route through `switchEntry`
    // (which would force `open = true`) — the panel stays exactly as restored.
    expect(context.panel.store.open).toBe(false)
  })

  it('does not clear an id `switchEntry` itself legitimately selects later (a subTabs anchor with no live member yet)', async () => {
    expect.assertions(1)

    const context = await createDocksContext(
      'embedded',
      createMockRpc([iframe('nuxt', { subTabs: { protocol: 'postmessage' } })]),
    )

    await context.docks.switchEntry('nuxt')

    expect(context.docks.selectedId).toBe('nuxt')
  })

  it('routes selectedId/open through the same panelStore ref passed in, alongside geometry', async () => {
    expect.assertions(3)

    const store = ref({ ...DEFAULT_DOCK_PANEL_STORE(), mode: 'float' as const })
    const context = await createDocksContext('embedded', createMockRpc([]), store)

    context.panel.store.open = true
    context.docks.selectedId = null

    expect(context.panel.store.open).toBe(true)
    expect(store.value.open).toBe(true)
    expect(store.value.mode).toBe('float')
  })

  it('still routes panel.store geometry fields (e.g. mode) through the same ref', async () => {
    expect.assertions(1)

    const store = ref(DEFAULT_DOCK_PANEL_STORE())
    const context = await createDocksContext('embedded', createMockRpc([]), store)

    context.panel.store.mode = 'edge'

    expect(store.value.mode).toBe('edge')
  })
})
