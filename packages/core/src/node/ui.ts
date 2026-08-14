import type { DevframeBranding, DevframeDockPreferences, EmbeddedVisibility } from '@devframes/hub-ui'
import type { DevframeHubUi } from '@devframes/hub/initiate'
import { createUi } from '@devframes/hub-ui'
import { DEVTOOLS_ASSETS_BASE } from '../dirs'

export interface ViteDevToolsUiOptions {
  /**
   * How the embedded floating dock reveals itself on a fresh page. Seeds a
   * user-overridable preference published as
   * `ConnectionMeta.configs.ui.embeddedVisibility`.
   *
   * @default 'normal'
   */
  embeddedVisibility?: EmbeddedVisibility
  /**
   * Dock-bar rendering preferences — category ordering, floating-dock
   * inline-item capacity, and the first-run float/edge mode and position.
   * Each seeds a user-overridable preference published as
   * `ConnectionMeta.configs.ui.dockPreferences`.
   */
  dockPreferences?: DevframeDockPreferences
}

export function viteDevToolsBranding(): DevframeBranding {
  return {
    productName: 'Vite DevTools',
    primaryColor: '#6b84fd',
    logo: `${DEVTOOLS_ASSETS_BASE}vite-plus.svg`,
    wordmark: {
      light: `${DEVTOOLS_ASSETS_BASE}vite-devtools-kit-light.svg`,
      dark: `${DEVTOOLS_ASSETS_BASE}vite-devtools-kit-dark.svg`,
    },
    favicon: `${DEVTOOLS_ASSETS_BASE}vite-plus.svg`,
    tagline: 'DevTools for Vite and the ecosystem',
    windowTitle: 'Vite DevTools',
  }
}

/**
 * Build the `@devframes/hub-ui` slot, branded as Vite DevTools, for the hub
 * that serves the DevTools client. Hands the reference viewer + embedded
 * bootstrap to `initHub({ ui })` (dev serve) or is copied out by the static
 * build.
 */
export function createViteDevToolsUi(options: ViteDevToolsUiOptions = {}): DevframeHubUi {
  return createUi({
    branding: viteDevToolsBranding(),
    embeddedVisibility: options.embeddedVisibility,
    dockPreferences: options.dockPreferences,
  })
}
