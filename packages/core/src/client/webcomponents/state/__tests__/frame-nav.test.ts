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
 * The frame-nav adapter listens for `message` events on `globalThis`. These
 * tests run in the node environment (no DOM), so stub the listener registry and
 * drive it with synthetic events — this exercises the viewer wiring we own
 * (auto-attach, member materialization, the nav loop) without a DOM dependency.
 */
function stubMessageBus() {
  const listeners = new Set<(ev: any) => void>()
  const origAdd = (globalThis as any).addEventListener
  const origRemove = (globalThis as any).removeEventListener;
  (globalThis as any).addEventListener = (type: string, cb: any) => {
    if (type === 'message')
      listeners.add(cb)
  }
  ;(globalThis as any).removeEventListener = (type: string, cb: any) => {
    if (type === 'message')
      listeners.delete(cb)
  }
  return {
    emit(data: unknown, origin = 'http://localhost:5173') {
      for (const cb of [...listeners]) cb({ origin, data })
    },
    get size() {
      return listeners.size
    },
    restore() {
      ;(globalThis as any).addEventListener = origAdd
      ;(globalThis as any).removeEventListener = origRemove
    },
  }
}

function makeFakeIframe(src: string) {
  const posted: { msg: any, origin: string }[] = []
  const iframe = {
    src,
    contentWindow: {
      postMessage: (msg: any, origin: string) => posted.push({ msg, origin }),
    },
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
