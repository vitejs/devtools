import type { DocksContext } from '@vitejs/devtools-kit/client'
import { createEventEmitter } from '@vitejs/devtools-kit/utils/events'
import { shallowRef } from 'vue'
import { setDocksOverflowPanel } from './floating-tooltip'

interface DocumentPictureInPicture {
  requestWindow: (options?: { width?: number, height?: number }) => Promise<Window>
}

type ColorMode = 'dark' | 'light'
interface DockPopupEvents {
  'popup:open-requested': (context: DocksContext) => void
}
type MainFrameDockActionHandler = (entryId: string) => Promise<boolean> | boolean

const PANEL_MIN_SIZE = 20
const PANEL_MAX_SIZE = 100
const POPUP_MIN_WIDTH = 320
const POPUP_MIN_HEIGHT = 240
const MAIN_FRAME_ACTION_HANDLER_KEY = '__VITE_DEVTOOLS_TRIGGER_DOCK_ACTION__'

const popupWindow = shallowRef<Window | null>(null)
const isPopupOpen = shallowRef(false)
const popupEvents = createEventEmitter<DockPopupEvents>()
let detachPopupListeners: (() => void) | undefined
let detachColorModeSync: (() => void) | undefined
let popupDockElement: (HTMLElement & { remove: () => void }) | undefined
let popupContext: DocksContext | undefined
let loadDockStandalone: () => Promise<new (props: { context: DocksContext }) => HTMLElement> = async () => {
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

function resolveColorMode(): ColorMode {
  const sourceWindow = window as Window & {
    document?: {
      documentElement?: { classList?: DOMTokenList, getAttribute?: (name: string) => string | null }
      body?: { classList?: DOMTokenList, getAttribute?: (name: string) => string | null }
    }
    matchMedia?: (query: string) => { matches: boolean }
  }

  const elements = [
    sourceWindow.document?.documentElement,
    sourceWindow.document?.body,
  ].filter(Boolean)

  for (const element of elements) {
    if (element?.classList?.contains('dark'))
      return 'dark'
    if (element?.classList?.contains('light'))
      return 'light'

    const dataTheme = element?.getAttribute?.('data-theme')
    if (dataTheme === 'dark' || dataTheme === 'light')
      return dataTheme
  }

  if (sourceWindow.matchMedia?.('(prefers-color-scheme: dark)').matches)
    return 'dark'

  return 'light'
}

function applyPopupColorMode(popup: Window, mode: ColorMode) {
  popup.document.documentElement?.style.setProperty('color-scheme', mode)
}

function setupPopupColorModeSync(popup: Window): () => void {
  const cleanups: Array<() => void> = []
  const update = () => applyPopupColorMode(popup, resolveColorMode())
  update()

  const sourceWindow = window as Window & {
    document?: {
      documentElement?: Element
      body?: Element
    }
    matchMedia?: (query: string) => MediaQueryList
  }
  const sourceDocument = sourceWindow.document

  if (typeof MutationObserver !== 'undefined' && sourceDocument) {
    const observer = new MutationObserver(update)
    for (const element of [sourceDocument.documentElement, sourceDocument.body]) {
      if (!element)
        continue
      observer.observe(element, {
        attributes: true,
        attributeFilter: ['class', 'data-theme', 'style'],
      })
    }
    cleanups.push(() => observer.disconnect())
  }

  if (sourceWindow.matchMedia) {
    const darkQuery = sourceWindow.matchMedia('(prefers-color-scheme: dark)')
    const lightQuery = sourceWindow.matchMedia('(prefers-color-scheme: light)')
    darkQuery.addEventListener('change', update)
    lightQuery.addEventListener('change', update)
    cleanups.push(() => {
      darkQuery.removeEventListener('change', update)
      lightQuery.removeEventListener('change', update)
    })
  }

  return () => {
    cleanups.forEach(fn => fn())
  }
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

function syncPanelSizeFromPopup(context: DocksContext, popup: Window) {
  if (window.innerWidth <= 0 || window.innerHeight <= 0)
    return
  context.panel.store.width = clamp(Math.round(popup.innerWidth / window.innerWidth * 100), PANEL_MIN_SIZE, PANEL_MAX_SIZE)
  context.panel.store.height = clamp(Math.round(popup.innerHeight / window.innerHeight * 100), PANEL_MIN_SIZE, PANEL_MAX_SIZE)
}

async function mountStandaloneApp(context: DocksContext, popup: Window) {
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

export function requestDockPopupOpen(context: DocksContext) {
  popupEvents.emit('popup:open-requested', context)
}

export function closeDockPopup() {
  const popup = popupWindow.value
  clearPopupState()
  if (!popup || popup.closed)
    return
  popup.close()
}

export function setDockStandaloneLoaderForTest(loader?: () => Promise<new (props: { context: DocksContext }) => HTMLElement>) {
  loadDockStandalone = loader || (async () => {
    return await import('../components/DockStandalone').then(m => m.DockStandalone)
  })
}

export async function openDockPopup(context: DocksContext): Promise<Window | null> {
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
