import type { DocksContext } from '@vitejs/devtools-kit/client'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { setDocksOverflowPanel, useDocksOverflowPanel } from '../floating-tooltip'
import { closeDockPopup, filterPopupDockEntry, isDockPopupEntryVisible, isDockPopupSupported, openDockPopup, setDockStandaloneLoaderForTest, useDockPopupWindow, useIsDockPopupOpen } from '../popup'

const {
  DockStandaloneElementMock,
  dockStandaloneCtorCalls,
  dockElementRemoveMock,
} = vi.hoisted(() => {
  const dockElementRemoveMock = vi.fn()
  const dockStandaloneCtorCalls: Array<{ context: DocksContext }> = []
  class DockStandaloneElementMock {
    context: DocksContext
    remove: () => void
    style: Record<string, string>
    constructor({ context }: { context: DocksContext }) {
      this.context = context
      this.remove = dockElementRemoveMock
      this.style = {}
      dockStandaloneCtorCalls.push({ context })
    }
  }
  return {
    DockStandaloneElementMock: DockStandaloneElementMock as unknown as new (props: { context: DocksContext }) => HTMLElement,
    dockStandaloneCtorCalls,
    dockElementRemoveMock,
  }
})

function createMockContext(
  {
    width = 80,
    height = 80,
  }: {
    width?: number
    height?: number
  } = {},
): DocksContext {
  return {
    panel: {
      store: {
        width,
        height,
        top: 0,
        left: 0,
        position: 'left',
        open: false,
        inactiveTimeout: 3_000,
      },
    },
  } as unknown as DocksContext
}

function createMockDocument() {
  const head = {
    appended: [] as any[],
    appendChild: vi.fn((node: any) => {
      head.appended.push(node)
      return node
    }),
  }
  const body = {
    textContent: '',
    appended: [] as any[],
    appendChild: vi.fn((node: any) => {
      body.appended.push(node)
      return node
    }),
  }
  return {
    title: '',
    head,
    body,
    createElement: vi.fn((tag: string) => {
      const attrs: Record<string, string> = {}
      const element = {
        tag,
        id: '',
        textContent: '',
        title: '',
        src: '',
        appended: [] as any[],
        appendChild: vi.fn((node: any) => {
          element.appended.push(node)
          return node
        }),
        setAttribute: (name: string, value: string) => {
          attrs[name] = value
        },
        getAttribute: (name: string) => attrs[name],
      }
      return element
    }),
  }
}

function createMockPopupWindow(
  {
    innerWidth = 640,
    innerHeight = 480,
  }: {
    innerWidth?: number
    innerHeight?: number
  } = {},
): Window & { dispatchEvent: (event: Event) => boolean, document: ReturnType<typeof createMockDocument>, focus: ReturnType<typeof vi.fn>, close: ReturnType<typeof vi.fn>, closed: boolean } {
  const events = new EventTarget()
  const document = createMockDocument()
  const popup = {
    innerWidth,
    innerHeight,
    closed: false,
    document,
    focus: vi.fn(),
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
  } as unknown as Window & { dispatchEvent: (event: Event) => boolean, document: ReturnType<typeof createMockDocument>, focus: ReturnType<typeof vi.fn>, close: ReturnType<typeof vi.fn>, closed: boolean }

  popup.close = vi.fn(() => {
    popup.closed = true
    popup.dispatchEvent(new Event('pagehide'))
  })

  return popup
}

describe('dock popup state', () => {
  beforeEach(() => {
    closeDockPopup()
    setDocksOverflowPanel(null)
    setDockStandaloneLoaderForTest(async () => DockStandaloneElementMock)
    dockStandaloneCtorCalls.length = 0
    dockElementRemoveMock.mockClear()
    ;(globalThis as { window?: any }).window = {
      innerWidth: 1200,
      innerHeight: 800,
    }
    delete (window as Window & { documentPictureInPicture?: unknown }).documentPictureInPicture
  })

  afterAll(() => {
    setDockStandaloneLoaderForTest()
  })

  it('returns null when the API is unavailable', async () => {
    expect(isDockPopupSupported()).toBe(false)
    expect(isDockPopupEntryVisible('embedded')).toBe(false)
    const popup = await openDockPopup(createMockContext())
    expect(popup).toBeNull()
    expect(useIsDockPopupOpen().value).toBe(false)
  })

  it('hides popup entry when popup is already open', async () => {
    const popup = createMockPopupWindow()
    const requestWindow = vi.fn().mockResolvedValue(popup)
    ;(window as Window & { documentPictureInPicture?: unknown }).documentPictureInPicture = { requestWindow }

    expect(isDockPopupEntryVisible('embedded')).toBe(true)
    await openDockPopup(createMockContext())
    expect(isDockPopupEntryVisible('embedded')).toBe(false)
  })

  it('hides popup entry when running inside popup window', () => {
    ;(window as Window & { documentPictureInPicture?: unknown }).documentPictureInPicture = { requestWindow: vi.fn() }

    expect(isDockPopupEntryVisible('standalone')).toBe(false)
  })

  it('filters popup entry from grouped entries', () => {
    const groups = [
      ['~builtin', [
        { type: '~builtin', id: '~popup', title: 'Popup', icon: 'test' },
        { type: '~builtin', id: '~settings', title: 'Settings', icon: 'test' },
      ]],
      ['default', [
        { type: 'iframe', id: 'app', title: 'App', icon: 'test', url: 'http://example.com' },
      ]],
    ] as const as Parameters<typeof filterPopupDockEntry>[0]

    expect(filterPopupDockEntry(groups)).toEqual([
      ['~builtin', [
        { type: '~builtin', id: '~settings', title: 'Settings', icon: 'test' },
      ]],
      ['default', [
        { type: 'iframe', id: 'app', title: 'App', icon: 'test', url: 'http://example.com' },
      ]],
    ])
  })

  it('opens popup window and mounts standalone frame', async () => {
    const popup = createMockPopupWindow()
    const requestWindow = vi.fn().mockResolvedValue(popup)
    ;(window as Window & { documentPictureInPicture?: unknown }).documentPictureInPicture = { requestWindow }

    const context = createMockContext({ width: 70, height: 60 })
    const result = await openDockPopup(context)

    expect(result).toBe(popup)
    expect(requestWindow).toHaveBeenCalledWith({
      width: Math.round(window.innerWidth * 0.7),
      height: Math.round(window.innerHeight * 0.6),
    })
    expect(dockStandaloneCtorCalls).toHaveLength(1)
    expect(dockStandaloneCtorCalls[0]).toEqual({ context })
    expect(useDockPopupWindow().value).toBe(popup)
    expect(useIsDockPopupOpen().value).toBe(true)
    expect(popup.document.title).toBe('Vite DevTools')
    const appRoot = popup.document.body.appended[0]
    expect(appRoot).toBeTruthy()
    expect(appRoot.id).toBe('vite-devtools-popup-root')
    expect(appRoot.appended).toHaveLength(1)
  })

  it('hides dock overflow panel when opening popup', async () => {
    const popup = createMockPopupWindow()
    const requestWindow = vi.fn().mockResolvedValue(popup)
    ;(window as Window & { documentPictureInPicture?: unknown }).documentPictureInPicture = { requestWindow }
    setDocksOverflowPanel({
      el: {} as HTMLElement,
      content: 'test',
    })

    expect(useDocksOverflowPanel().value).toBeTruthy()
    await openDockPopup(createMockContext())
    expect(useDocksOverflowPanel().value).toBeNull()
  })

  it('reuses existing popup window', async () => {
    const popup = createMockPopupWindow()
    const requestWindow = vi.fn().mockResolvedValue(popup)
    ;(window as Window & { documentPictureInPicture?: unknown }).documentPictureInPicture = { requestWindow }

    const context = createMockContext()
    await openDockPopup(context)
    const second = await openDockPopup(context)

    expect(second).toBe(popup)
    expect(requestWindow).toHaveBeenCalledTimes(1)
    expect(popup.focus).toHaveBeenCalledTimes(1)
  })

  it('clears popup state when popup is closed', async () => {
    const popup = createMockPopupWindow()
    const requestWindow = vi.fn().mockResolvedValue(popup)
    ;(window as Window & { documentPictureInPicture?: unknown }).documentPictureInPicture = { requestWindow }

    await openDockPopup(createMockContext())
    expect(useIsDockPopupOpen().value).toBe(true)

    popup.dispatchEvent(new Event('pagehide'))

    expect(dockElementRemoveMock).toHaveBeenCalledTimes(1)
    expect(useIsDockPopupOpen().value).toBe(false)
    expect(useDockPopupWindow().value).toBeNull()
  })

  it('closes popup window via closeDockPopup', async () => {
    const popup = createMockPopupWindow()
    const requestWindow = vi.fn().mockResolvedValue(popup)
    ;(window as Window & { documentPictureInPicture?: unknown }).documentPictureInPicture = { requestWindow }

    await openDockPopup(createMockContext())
    closeDockPopup()

    expect(dockElementRemoveMock).toHaveBeenCalledTimes(1)
    expect(popup.close).toHaveBeenCalledTimes(1)
    expect(useIsDockPopupOpen().value).toBe(false)
    expect(useDockPopupWindow().value).toBeNull()
  })
})
