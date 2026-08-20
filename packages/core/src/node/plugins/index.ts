import type { DockRendererRegistration } from '@vitejs/devtools-kit'
import type { Plugin } from 'vite'
import type { ViteDevToolsUiOptions } from '../ui'
import { DevToolsBuild } from './build'
import { DevToolsBuiltin } from './builtin'
import { DevToolsInjection } from './injection'
import { DevToolsServer } from './server'

export interface DevToolsOptions {
  /** Directory to search for installed integrations. */
  cwd?: string
  /**
   * Include the Vite builtin devtools UI.
   *
   * @default true
   */
  builtinDevTools?: boolean

  /** Dock renderer modules, replacing built-ins with the same type and appending new types. */
  renderers?: readonly DockRendererRegistration[]

  /**
   * Override the branding handed to the DevTools client (`@devframes/hub-ui`)
   * — product name, logo, wordmark, primary color, tagline, favicon, and
   * window title.
   *
   * Each field is merged over the built-in Vite DevTools defaults, so a host
   * embedding Vite DevTools (e.g. Nuxt DevTools) can re-skin the client while
   * inheriting any field it leaves unset. Asset fields
   * (`logo`/`wordmark`/`favicon`) take URL strings the host is responsible for
   * serving.
   */
  branding?: ViteDevToolsUiOptions['branding']

  /**
   * How the embedded floating dock reveals itself on a fresh page.
   *
   * - `'normal'` — show the docks immediately.
   * - `'passive'` — the floating docks stay hidden and a console hint invites
   *   the developer to reveal them with a keyboard shortcut. Revealing once
   *   persists per-origin, so later dev sessions on this browser start shown;
   *   the "Hide DevTools" command returns to passive mode.
   * - `'hidden'` — always keep the docks hidden; the shortcut reveals them for
   *   the current session only, without remembering the choice.
   *
   * Seeds a user-overridable preference published as
   * `ConnectionMeta.configs.ui.embeddedVisibility`.
   *
   * @default 'normal'
   */
  embeddedVisibility?: ViteDevToolsUiOptions['embeddedVisibility']

  /**
   * Dock-bar rendering preferences — category ordering, floating-dock
   * inline-item capacity, and the first-run float/edge mode and position.
   * Each seeds a user-overridable preference published as
   * `ConnectionMeta.configs.ui.dockPreferences`.
   */
  dockPreferences?: ViteDevToolsUiOptions['dockPreferences']

  /**
   * Options for building static DevTools output alongside `vite build`.
   */
  build?: {
    /**
     * Automatically build DevTools when running `vite build`.
     *
     * @default false
     */
    withApp?: boolean
    /**
     * Output directory for the DevTools build (relative to root).
     * Defaults to Vite's `build.outDir`.
     */
    outDir?: string
  }
}

export async function DevTools(options: DevToolsOptions = {}): Promise<Plugin[]> {
  const {
    builtinDevTools = true,
    build,
    branding,
    embeddedVisibility = 'normal',
    dockPreferences,
  } = options

  const ui = { branding, embeddedVisibility, dockPreferences }

  const plugins = [
    DevToolsInjection(),
    DevToolsServer(ui, options.renderers),
  ]

  if (build?.withApp) {
    plugins.push(DevToolsBuild({ outDir: build.outDir, ui, renderers: options.renderers }))
  }

  plugins.unshift(
    ...await DevToolsBuiltin({
      cwd: options.cwd,
      builtinDevTools,
    }),
  )

  return plugins
}

export {
  DevToolsBuild,
  DevToolsInjection,
  DevToolsServer,
}
