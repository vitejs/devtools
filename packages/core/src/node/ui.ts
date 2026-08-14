import type { DevframeBranding } from '@devframes/hub-ui'
import type { DevframeHubUi } from '@devframes/hub/initiate'
import { createUi } from '@devframes/hub-ui'
import { DEVTOOLS_ASSETS_BASE } from '../dirs'

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
export function createViteDevToolsUi(): DevframeHubUi {
  return createUi({ branding: viteDevToolsBranding() })
}
