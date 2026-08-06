import type { DevToolsDocksContext } from './context'
import { createEventEmitter } from 'devframe/utils/events'
import { shallowRef, watch } from 'vue'
import { isDark } from './color-mode'
import { setDocksOverflowPanel } from './floating-tooltip'

interface DocumentPictureInPicture {
  requestWindow: (options?: { width?: number, height?: number }) => Promise<Window>
}

interface DockPopupEvents {
  'popup:open-requested': (context: DevToolsDocksContext) => void
}
type MainFrameDockActionHandler = (entryId: string) => Promise<boolean> | boolean

const PANEL_MIN_SIZE = 20
const PANEL_MAX_SIZE = 100
const POPUP_MIN_WIDTH = 320
const POPUP_MIN_HEIGHT = 240
const MAIN_FRAME_ACTION_HANDLER_KEY = '__VITE_DEVTOOLS_TRIGGER_DOCK_ACTION__'
const DEVFRAME_CONNECTION_META_KEY = '__DEVFRAME_CONNECTION_META__'

const popupWindow = shallowRef<Window | null>(null)
const isPopupOpen = shallowRef(false)
const popupEvents = createEventEmitter<DockPopupEvents>()
let detachPopupListeners: (() => void) | undefined
let detachColorModeSync: (() => void) | undefined
let popupDockElement: (HTMLElement & { remove: () => void }) | undefined
let popupContext: DevToolsDocksContext | undefined
let loadDockStandalone: () => Promise<new (props: { context: DevToolsDocksContext }) => HTMLElement> = async () => {
  return await import('../components/DockStandalone').then(m => m.DockStandalone)
}

popupEvents.on('popup:open-requested', (context) => {
  void openDockPopup(context)
})

function getDocumentPictureInPicture(): DocumentPictureInPicture | undefined {
  if (typeof window === 'undefined')
    return
  return (window as Window & { documentPictureInPicture?: DocumentPictureInPicture }).documentPictureInPicture
}

function clearListeners() {
  detachPopupListeners?.()
  detachPopupListeners = undefined
  detachColorModeSync?.()
  detachColorModeSync = undefined
}

function setupPopupColorModeSync(popup: Window): () => void {
  // Mirror the shared color-mode preference into the popup document's native
  // `color-scheme` (scrollbars / form controls); the standalone shell inside
  // handles its own `.dark`/`.light` class via `applyColorSchemeClass`.
  return watch(
    isDark,
    (dark) => {
      popup.document.documentElement?.style.setProperty('color-scheme', dark ? 'dark' : 'light')
    },
    { immediate: true },
  )
}

function unmountPopupElement() {
  popupDockElement?.remove()
  popupDockElement = undefined
}

function clearPopupState() {
  clearListeners()
  unmountPopupElement()
  popupWindow.value = null
  isPopupOpen.value = false
  const ctx = popupContext
  popupContext = undefined
  ctx?.docks.switchEntry(null)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function syncPanelSizeFromPopup(context: DevToolsDocksContext, popup: Window) {
  if (window.innerWidth <= 0 || window.innerHeight <= 0)
    return
  context.panel.store.width = clamp(Math.round(popup.innerWidth / window.innerWidth * 100), PANEL_MIN_SIZE, PANEL_MAX_SIZE)
  context.panel.store.height = clamp(Math.round(popup.innerHeight / window.innerHeight * 100), PANEL_MIN_SIZE, PANEL_MAX_SIZE)
}

async function mountStandaloneApp(context: DevToolsDocksContext, popup: Window) {
  const DockStandaloneElement = await loadDockStandalone()

  const baseStyle = popup.document.createElement('style')
  baseStyle.textContent = [
    'html, body {',
    '  margin: 0;',
    '  padding: 0;',
    '  width: 100%;',
    '  height: 100%;',
    '  overflow: hidden;',
    '  background: transparent;',
    '}',
    '#vite-devtools-popup-root {',
    '  width: 100vw;',
    '  height: 100vh;',
    '}',
    '#vite-devtools-popup-root > vite-devtools-dock-standalone {',
    '  display: block;',
    '  width: 100%;',
    '  height: 100%;',
    '}',
  ].join('\n')

  popup.document.title = 'Vite DevTools'
  popup.document.head?.appendChild(baseStyle)
  popup.document.body.textContent = ''

  // Prefer the meta devframe's client already published on the main window
  // (annotated with the absolute `baseUrl` it was resolved from) so devframe
  // iframes mounted at other bases inside the popup inherit a dialable
  // endpoint; fall back to the raw client meta.
  ;(popup as Window & { [DEVFRAME_CONNECTION_META_KEY]?: unknown })[DEVFRAME_CONNECTION_META_KEY]
    = (globalThis as Record<string, unknown>)[DEVFRAME_CONNECTION_META_KEY] ?? context.rpc.connectionMeta

  const appRoot = popup.document.createElement('div')
  appRoot.id = 'vite-devtools-popup-root'
  popup.document.body.appendChild(appRoot)

  const dockElement = new DockStandaloneElement({ context })
  popupDockElement = dockElement
  appRoot.appendChild(dockElement)
}

export function isDockPopupSupported(): boolean {
  return !!getDocumentPictureInPicture()?.requestWindow
}

export function registerMainFrameDockActionHandler(
  clientType: 'embedded' | 'standalone',
  handler: MainFrameDockActionHandler,
) {
  if (typeof window === 'undefined') {
    return
  }
  if (clientType === 'standalone') {
    return
  }
  ;(window as Window & { [MAIN_FRAME_ACTION_HANDLER_KEY]?: MainFrameDockActionHandler })[MAIN_FRAME_ACTION_HANDLER_KEY] = handler
}

export async function triggerMainFrameDockAction(
  clientType: 'embedded' | 'standalone',
  entryId: string,
): Promise<boolean | undefined> {
  if (typeof window === 'undefined')
    return undefined
  if (clientType !== 'standalone')
    return undefined

  try {
    const opener = window.opener as (Window & { [MAIN_FRAME_ACTION_HANDLER_KEY]?: MainFrameDockActionHandler }) | null
    if (!opener || opener.closed)
      return undefined
    const handler = opener[MAIN_FRAME_ACTION_HANDLER_KEY]
    if (typeof handler !== 'function')
      return undefined
    return await handler(entryId)
  }
  catch {
    return undefined
  }
}

export function useDockPopupWindow() {
  return popupWindow as Readonly<typeof popupWindow>
}

export function useIsDockPopupOpen() {
  return isPopupOpen as Readonly<typeof isPopupOpen>
}

export function requestDockPopupOpen(context: DevToolsDocksContext) {
  popupEvents.emit('popup:open-requested', context)
}

export function closeDockPopup() {
  const popup = popupWindow.value
  clearPopupState()
  if (!popup || popup.closed)
    return
  popup.close()
}

export function setDockStandaloneLoaderForTest(loader?: () => Promise<new (props: { context: DevToolsDocksContext }) => HTMLElement>) {
  loadDockStandalone = loader || (async () => {
    return await import('../components/DockStandalone').then(m => m.DockStandalone)
  })
}

export async function openDockPopup(context: DevToolsDocksContext): Promise<Window | null> {
  setDocksOverflowPanel(null)

  const currentPopup = popupWindow.value
  if (currentPopup?.closed) {
    clearPopupState()
  }
  else if (currentPopup) {
    currentPopup.focus()
    return currentPopup
  }

  const documentPictureInPicture = getDocumentPictureInPicture()
  if (!documentPictureInPicture?.requestWindow)
    return null

  let openedPopup: Window | undefined
  try {
    const popup = openedPopup = await documentPictureInPicture.requestWindow({
      width: Math.max(POPUP_MIN_WIDTH, Math.round(window.innerWidth * context.panel.store.width / 100)),
      height: Math.max(POPUP_MIN_HEIGHT, Math.round(window.innerHeight * context.panel.store.height / 100)),
    })

    await mountStandaloneApp(context, popup)
    detachColorModeSync = setupPopupColorModeSync(popup)

    const onResize = () => syncPanelSizeFromPopup(context, popup)
    const onPageHide = () => {
      if (popupWindow.value !== popup)
        return
      clearPopupState()
    }

    popup.addEventListener('resize', onResize)
    popup.addEventListener('pagehide', onPageHide)
    detachPopupListeners = () => {
      popup.removeEventListener('resize', onResize)
      popup.removeEventListener('pagehide', onPageHide)
    }

    popupContext = context
    popupWindow.value = popup
    isPopupOpen.value = true
    return popup
  }
  catch {
    if (openedPopup && !openedPopup.closed)
      openedPopup.close()
    clearPopupState()
    return null
  }
}
