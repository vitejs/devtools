/// <reference types="vite/client" />
/// <reference lib="dom" />

import type { DockPanelStorage } from '@vitejs/devtools-kit/client'
import { CLIENT_CONTEXT_KEY, getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { DEVTOOLS_HIDE_EVENT, DEVTOOLS_MODE_FILENAME, DEVTOOLS_MOUNT_PATH } from '@vitejs/devtools-kit/constants'
import { useLocalStorage } from '@vueuse/core'
import { createDocksContext } from '../webcomponents/state/context'

export type InjectMode = 'passive' | 'normal'

// Endpoint the node middleware serves next to `__connection.json`. Node picks
// which client entry to inject (`inject` vs `inject-passive`) from the persisted
// flag; this `POST { enabled }` is how the client writes that flag back when the
// developer activates the docks or hides them again.
const MODE_URL = `${DEVTOOLS_MOUNT_PATH}${DEVTOOLS_MODE_FILENAME}`

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform ?? '')

// Activation combo mirrors Nuxt DevTools' Shift+Alt+D so muscle memory carries
// over. Displayed with platform-native glyphs.
const SHORTCUT_LABEL = isMac ? '⇧ ⌥ D' : 'Shift + Alt + D'

let dockEl: HTMLElement | undefined
let shortcutListener: ((event: KeyboardEvent) => void) | undefined

function matchesActivation(event: KeyboardEvent): boolean {
  return event.altKey
    && event.shiftKey
    && !event.ctrlKey
    && !event.metaKey
    && (event.code === 'KeyD' || event.key === 'd' || event.key === 'D')
}

async function persistNormalMode(enabled: boolean): Promise<void> {
  try {
    await fetch(MODE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
  }
  catch {
    // Persistence is best-effort — the overlay still toggles for this session.
  }
}

async function mountDock(): Promise<void> {
  if (dockEl)
    return

  // Inject runs in the user's host page, so `document.baseURI` points at
  // the user's app — not at the Vite DevTools mount. Pass the mount path
  // explicitly so the connection meta lookup hits `/__devtools/__connection.json`.
  const rpc = await getDevToolsRpcClient({ baseURL: DEVTOOLS_MOUNT_PATH })

  const state = useLocalStorage<DockPanelStorage>(
    'vite-devtools-dock-state',
    {
      mode: 'float',
      width: 80,
      height: 80,
      top: 0,
      left: 0,
      position: 'left',
      open: false,
      inactiveTimeout: 3_000,
    },
    { mergeDefaults: true },
  )

  const context = await createDocksContext(
    'embedded',
    rpc,
    state,
  )
  ;(globalThis as any)[CLIENT_CONTEXT_KEY] = context

  const { DockEmbedded } = import.meta.env.VITE_DEVTOOLS_LOCAL_DEV
    ? await import('../webcomponents')
    : await import('@vitejs/devtools/client/webcomponents')

  dockEl = new DockEmbedded({ context }) as unknown as HTMLElement
  document.body.appendChild(dockEl)
}

function unmountDock(): void {
  dockEl?.remove()
  dockEl = undefined
}

function printPassiveHint(): void {
  // eslint-disable-next-line no-console
  console.log(
    `%c Vite DevTools %c press %c${SHORTCUT_LABEL}%c to open`,
    'background:#646cff;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold',
    'color:inherit',
    'background:#2d2d2d;color:#fff;padding:1px 6px;border-radius:4px;font-family:monospace',
    'color:inherit',
  )
}

function armPassive(): void {
  printPassiveHint()
  if (shortcutListener)
    return
  shortcutListener = (event) => {
    if (!matchesActivation(event))
      return
    event.preventDefault()
    disarmPassive()
    void activate()
  }
  window.addEventListener('keydown', shortcutListener, true)
}

function disarmPassive(): void {
  if (!shortcutListener)
    return
  window.removeEventListener('keydown', shortcutListener, true)
  shortcutListener = undefined
}

// Reveal the docks and remember "normal mode" for this project so the next load
// injects the `inject` (normal) entry directly.
async function activate(): Promise<void> {
  await persistNormalMode(true)
  await mountDock()
}

// Tear the docks down and drop back to passive mode (the "Hide DevTools"
// command dispatches `DEVTOOLS_HIDE_EVENT` to reach us here).
async function deactivate(): Promise<void> {
  await persistNormalMode(false)
  unmountDock()
  armPassive()
}

/**
 * Boot the injected overlay in the given mode. `normal` mounts the docks
 * immediately; `passive` prints the activation hint and waits for the shortcut.
 * Either way the client can transition between the two in-page (activate / the
 * "Hide DevTools" command) without a reload.
 */
export function startDevTools(initialMode: InjectMode): void {
  if (window.parent !== window) {
    // eslint-disable-next-line no-console
    console.log('[VITE DEVTOOLS] Skipping in iframe')
    return
  }

  // eslint-disable-next-line no-console
  console.log('[VITE DEVTOOLS] Client injected')

  window.addEventListener(DEVTOOLS_HIDE_EVENT, () => {
    void deactivate()
  })

  if (initialMode === 'passive')
    armPassive()
  else
    void mountDock()
}
