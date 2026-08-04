import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { DEFAULT_STATE_USER_SETTINGS } from '@vitejs/devtools-kit/constants'
import { createSharedState } from 'devframe/utils/shared-state'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { createDocksContext } from '../context'

function createMockRpc(entries: DevToolsDockEntry[] = []): DevToolsRpcClient {
  const docksState = createSharedState({ initialValue: entries, enablePatches: false })
  const settingsState = createSharedState({ initialValue: DEFAULT_STATE_USER_SETTINGS(), enablePatches: false })
  const commandsState = createSharedState({ initialValue: [] as any[], enablePatches: false })

  return {
    client: { register: () => () => {} },
    connectionMeta: { backend: 'websocket' },
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

/**
 * A `message` listener registry standing in for one window realm. Tests drive it
 * with synthetic events instead of real `postMessage`.
 */
function createMessageRegistry() {
  const listeners = new Set<(ev: any) => void>()
  return {
    addEventListener(type: string, cb: any) {
      if (type === 'message')
        listeners.add(cb)
    },
    removeEventListener(type: string, cb: any) {
      if (type === 'message')
        listeners.delete(cb)
    },
    emit(data: unknown, origin = 'http://localhost:5173') {
      for (const cb of [...listeners]) cb({ origin, data })
    },
    get size() {
      return listeners.size
    },
  }
}

/**
 * The frame-nav adapter listens for `message` events on the iframe's own realm,
 * falling back to `globalThis`. These tests run in the node environment (no DOM),
 * so stub the global listener registry and drive it with synthetic events — this
 * exercises the viewer wiring we own (auto-attach, member materialization, the
 * nav loop) without a DOM dependency.
 */
function stubMessageBus() {
  const registry = createMessageRegistry()
  const origAdd = (globalThis as any).addEventListener
  const origRemove = (globalThis as any).removeEventListener;
  (globalThis as any).addEventListener = registry.addEventListener
  ;(globalThis as any).removeEventListener = registry.removeEventListener
  return {
    emit: registry.emit,
    get size() {
      return registry.size
    },
    restore() {
      ;(globalThis as any).addEventListener = origAdd
      ;(globalThis as any).removeEventListener = origRemove
    },
  }
}

/**
 * A window realm other than the main one — what the dock sees when it is mounted
 * inside a Document Picture-in-Picture popup.
 */
function makeFakeRealm() {
  return createMessageRegistry()
}

function makeFakeIframe(src: string, realm?: ReturnType<typeof makeFakeRealm>) {
  const posted: { msg: any, origin: string }[] = []
  const iframe = {
    src,
    contentWindow: {
      postMessage: (msg: any, origin: string) => posted.push({ msg, origin }),
    },
    // Left undefined unless a realm is given, so the adapter falls back to
    // `globalThis` exactly as it does for the plain single-realm tests.
    ownerDocument: realm ? { defaultView: realm } : undefined,
  }
  return { iframe: iframe as unknown as HTMLIFrameElement, posted }
}

const ANCHOR_URL = 'http://localhost:5173/__nuxt__/'

function anchorEntry(): DevToolsDockEntry {
  return {
    id: 'nuxt',
    type: 'iframe',
    title: 'Nuxt DevTools',
    icon: 'i-logos:nuxt-icon',
    url: ANCHOR_URL,
    frameId: 'nuxt',
    subTabs: { protocol: 'postmessage' },
  } as DevToolsDockEntry
}

const READY_TABS = [
  { id: 'modules', title: 'Modules', navTarget: { path: '/modules' } },
  { id: 'timeline', title: 'Timeline', navTarget: { path: '/timeline' } },
]

function frameMessage(type: string, payload: Record<string, unknown> = {}) {
  return { channel: 'devframe:frame-nav', v: 1, frameId: 'nuxt', from: 'frame', type, ...payload }
}

describe('client-only dock registration', () => {
  it('materializes an entry state synchronously so getStateById works right after register', async () => {
    const context = await createDocksContext('embedded', createMockRpc())

    const handle = context.docks.register({
      id: 'tab:one',
      type: 'iframe',
      title: 'One',
      icon: 'i',
      url: '/one',
    } as DevToolsDockEntry)

    // The adapter subscribes to activation immediately after registering — the
    // state must exist synchronously, not on the next reactive flush.
    const state = context.docks.getStateById('tab:one')
    expect(state).toBeDefined()

    let activated = false
    state!.events.on('entry:activated', () => {
      activated = true
    })
    await context.docks.switchEntry('tab:one')
    expect(activated).toBe(true)

    handle.dispose()
  })

  it('clears the selection and drops the state when the active client dock is disposed', async () => {
    const context = await createDocksContext('embedded', createMockRpc())
    const handle = context.docks.register({
      id: 'tab:two',
      type: 'iframe',
      title: 'Two',
      icon: 'i',
      url: '/two',
    } as DevToolsDockEntry)

    await context.docks.switchEntry('tab:two')
    expect(context.docks.selectedId).toBe('tab:two')

    handle.dispose()
    expect(context.docks.getStateById('tab:two')).toBeUndefined()
    expect(context.docks.selectedId).toBeNull()
  })
})

describe('shared-iframe soft navigation', () => {
  let bus: ReturnType<typeof stubMessageBus> | undefined

  afterEach(() => {
    bus?.restore()
    bus = undefined
  })

  it('attaches the frame-nav adapter and posts hello when the anchor iframe mounts', async () => {
    bus = stubMessageBus()
    const context = await createDocksContext('embedded', createMockRpc([anchorEntry()]))
    const { iframe, posted } = makeFakeIframe(ANCHOR_URL)

    const state = context.docks.getStateById('nuxt')!
    state.domElements.iframe = iframe
    await nextTick()

    expect(bus.size).toBe(1)
    expect(posted.some(p => p.msg.type === 'hello')).toBe(true)
    expect(posted.every(p => p.origin === 'http://localhost:5173')).toBe(true)
  })

  it('materializes one member dock per reported tab and selects the current one', async () => {
    bus = stubMessageBus()
    const context = await createDocksContext('embedded', createMockRpc([anchorEntry()]))
    const { iframe } = makeFakeIframe(ANCHOR_URL)

    context.docks.getStateById('nuxt')!.domElements.iframe = iframe
    await nextTick()

    bus.emit(frameMessage('ready', { tabs: READY_TABS, current: 'modules' }))

    const ids = context.docks.entries.map(e => e.id)
    expect(ids).toContain('nuxt:modules')
    expect(ids).toContain('nuxt:timeline')
    // Member docks share the anchor's frame + carry their own nav target.
    const modules = context.docks.entries.find(e => e.id === 'nuxt:modules') as any
    expect(modules.frameId).toBe('nuxt')
    expect(modules.navTarget).toEqual({ path: '/modules' })
    expect(context.docks.selectedId).toBe('nuxt:modules')
  })

  it('posts navigate when a member is selected in the dock bar', async () => {
    bus = stubMessageBus()
    const context = await createDocksContext('embedded', createMockRpc([anchorEntry()]))
    const { iframe, posted } = makeFakeIframe(ANCHOR_URL)

    context.docks.getStateById('nuxt')!.domElements.iframe = iframe
    await nextTick()
    bus.emit(frameMessage('ready', { tabs: READY_TABS, current: 'modules' }))

    posted.length = 0
    await context.docks.switchEntry('nuxt:timeline')

    const navigate = posted.find(p => p.msg.type === 'navigate')
    expect(navigate).toBeDefined()
    expect(navigate!.msg.tabId).toBe('timeline')
    expect(navigate!.msg.navTarget).toEqual({ path: '/timeline' })
  })

  it('moves the dock highlight when the frame reports internal navigation', async () => {
    bus = stubMessageBus()
    const context = await createDocksContext('embedded', createMockRpc([anchorEntry()]))
    const { iframe, posted } = makeFakeIframe(ANCHOR_URL)

    context.docks.getStateById('nuxt')!.domElements.iframe = iframe
    await nextTick()
    bus.emit(frameMessage('ready', { tabs: READY_TABS, current: 'modules' }))

    posted.length = 0
    bus.emit(frameMessage('navigated', { tabId: 'timeline' }))

    expect(context.docks.selectedId).toBe('nuxt:timeline')
    // The highlight-only update must not echo a navigate back to the frame.
    expect(posted.some(p => p.msg.type === 'navigate')).toBe(false)
  })

  it('removes member docks and clears selection when the manifest empties', async () => {
    bus = stubMessageBus()
    const context = await createDocksContext('embedded', createMockRpc([anchorEntry()]))
    const { iframe } = makeFakeIframe(ANCHOR_URL)

    context.docks.getStateById('nuxt')!.domElements.iframe = iframe
    await nextTick()
    bus.emit(frameMessage('ready', { tabs: READY_TABS, current: 'modules' }))
    expect(context.docks.selectedId).toBe('nuxt:modules')

    bus.emit(frameMessage('manifest', { tabs: [] }))

    const ids = context.docks.entries.map(e => e.id)
    expect(ids).not.toContain('nuxt:modules')
    expect(ids).not.toContain('nuxt:timeline')
    expect(context.docks.selectedId).toBeNull()
  })
})

// Each dock shell (float, edge, popup) owns its own `IframePanes` manager and
// creates panes in its own document. Popup mode is Document Picture-in-Picture,
// so the anchor iframe lives in the popup's realm and its shim posts the ready
// handshake there — an adapter listening on the main window never hears it, and
// the group renders with no members.
describe('frame-nav across window realms', () => {
  let bus: ReturnType<typeof stubMessageBus> | undefined

  afterEach(() => {
    bus?.restore()
    bus = undefined
  })

  it('listens on the iframe\'s own realm, not the main window', async () => {
    bus = stubMessageBus()
    const popup = makeFakeRealm()
    const context = await createDocksContext('embedded', createMockRpc([anchorEntry()]))
    const { iframe } = makeFakeIframe(ANCHOR_URL, popup)

    context.docks.getStateById('nuxt')!.domElements.iframe = iframe
    await nextTick()

    expect(popup.size).toBe(1)
    expect(bus.size).toBe(0)

    // The main window hearing the manifest must change nothing.
    bus.emit(frameMessage('ready', { tabs: READY_TABS, current: 'modules' }))
    expect(context.docks.entries.map(e => e.id)).not.toContain('nuxt:modules')

    popup.emit(frameMessage('ready', { tabs: READY_TABS, current: 'modules' }))

    const ids = context.docks.entries.map(e => e.id)
    expect(ids).toContain('nuxt:modules')
    expect(ids).toContain('nuxt:timeline')
    expect(context.docks.selectedId).toBe('nuxt:modules')
  })

  it('re-attaches to the new iframe when the dock remounts in another realm', async () => {
    bus = stubMessageBus()
    const first = makeFakeRealm()
    const context = await createDocksContext('embedded', createMockRpc([anchorEntry()]))
    const { iframe: iframe1, posted: posted1 } = makeFakeIframe(ANCHOR_URL, first)

    const state = context.docks.getStateById('nuxt')!
    state.domElements.iframe = iframe1
    await nextTick()
    first.emit(frameMessage('ready', { tabs: READY_TABS, current: 'modules' }))
    expect(context.docks.selectedId).toBe('nuxt:modules')

    // Switching shells mounts a brand-new iframe element in a different document.
    const second = makeFakeRealm()
    const { iframe: iframe2, posted: posted2 } = makeFakeIframe(ANCHOR_URL, second)
    posted1.length = 0
    state.domElements.iframe = iframe2
    await nextTick()

    // The stale adapter is torn down and a fresh handshake runs against iframe #2.
    expect(first.size).toBe(0)
    expect(second.size).toBe(1)
    expect(posted2.some(p => p.msg.type === 'hello')).toBe(true)

    second.emit(frameMessage('ready', { tabs: READY_TABS, current: 'modules' }))
    posted1.length = 0
    posted2.length = 0
    await context.docks.switchEntry('nuxt:timeline')

    // Nav goes to the live iframe, not the unmounted one.
    const navigate = posted2.find(p => p.msg.type === 'navigate')
    expect(navigate).toBeDefined()
    expect(navigate!.msg.tabId).toBe('timeline')
    expect(posted1.some(p => p.msg.type === 'navigate')).toBe(false)
  })
})

// A hidden `subTabs` anchor (`visibility: 'false'`) exists only to boot the
// shared frame; its synthesized member tabs render the real buttons. A group's
// `defaultChildId` points at the anchor so opening the group boots the frame —
// but selection must then land on a visible member tab, never linger on the
// invisible anchor.
describe('hidden subTabs anchor: selection lands on a visible member', () => {
  let bus: ReturnType<typeof stubMessageBus> | undefined

  afterEach(() => {
    bus?.restore()
    bus = undefined
  })

  function hiddenAnchorEntry(): DevToolsDockEntry {
    return { ...anchorEntry(), groupId: 'nuxt-group', visibility: 'false' } as DevToolsDockEntry
  }

  function groupEntry(): DevToolsDockEntry {
    return {
      id: 'nuxt-group',
      type: 'group',
      title: 'Nuxt',
      icon: 'i',
      defaultChildId: 'nuxt',
    } as DevToolsDockEntry
  }

  async function bootFrame(context: Awaited<ReturnType<typeof createDocksContext>>, current = 'modules') {
    const { iframe } = makeFakeIframe(ANCHOR_URL)
    context.docks.getStateById('nuxt')!.domElements.iframe = iframe
    await nextTick()
    bus!.emit(frameMessage('ready', { tabs: READY_TABS, current }))
  }

  it('first boot selects the anchor to mount its frame (no member exists yet)', async () => {
    bus = stubMessageBus()
    const context = await createDocksContext('embedded', createMockRpc([hiddenAnchorEntry()]))

    // No member tabs materialized yet, so selecting the anchor mounts its iframe.
    await context.docks.switchEntry('nuxt')
    expect(context.docks.selectedId).toBe('nuxt')
  })

  it('redirects a re-selected anchor to the frame\'s current member tab', async () => {
    bus = stubMessageBus()
    const context = await createDocksContext('embedded', createMockRpc([hiddenAnchorEntry()]))
    await bootFrame(context, 'modules')
    expect(context.docks.selectedId).toBe('nuxt:modules')

    await context.docks.switchEntry('nuxt:timeline')
    expect(context.docks.selectedId).toBe('nuxt:timeline')

    // Selecting the (hidden) anchor again lands back on the live member, not the anchor.
    await context.docks.switchEntry('nuxt')
    expect(context.docks.selectedId).toBe('nuxt:timeline')
  })

  it('re-opening the group lands on the current member, not the hidden anchor', async () => {
    bus = stubMessageBus()
    const context = await createDocksContext('embedded', createMockRpc([groupEntry(), hiddenAnchorEntry()]))

    // Open the group → boots the frame via its `defaultChildId` anchor → lands
    // on the reported member tab.
    await context.docks.switchEntry('nuxt-group')
    await bootFrame(context, 'modules')
    expect(context.docks.selectedId).toBe('nuxt:modules')

    await context.docks.switchEntry('nuxt:timeline')
    await context.docks.switchEntry(null)
    expect(context.docks.selectedId).toBeNull()

    // Re-open the group: it must resurface the current member, not the invisible anchor.
    await context.docks.switchEntry('nuxt-group')
    expect(context.docks.selectedId).toBe('nuxt:timeline')
  })

  it('falls back to the anchor when the remembered member no longer exists', async () => {
    bus = stubMessageBus()
    const context = await createDocksContext('embedded', createMockRpc([hiddenAnchorEntry()]))
    await bootFrame(context, 'modules')
    expect(context.docks.selectedId).toBe('nuxt:modules')

    // The manifest empties, disposing every member. Re-selecting the anchor now
    // has no live member to redirect to, so it boots the frame afresh.
    bus.emit(frameMessage('manifest', { tabs: [] }))
    expect(context.docks.selectedId).toBeNull()

    await context.docks.switchEntry('nuxt')
    expect(context.docks.selectedId).toBe('nuxt')
  })
})
