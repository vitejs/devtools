import type { DevframeBranding } from '@devframes/hub-ui'
import type { DevframeHubUi } from '@devframes/hub/initiate'
import type { DevToolsBranding, ViteDevToolsUiOptions } from './plugin-options'
import { createUi } from '@devframes/hub-ui'
import { DEVTOOLS_ASSETS_BASE } from '../dirs'

export type { ViteDevToolsUiOptions } from './plugin-options'

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
 *
 * A host embedding Vite DevTools (e.g. Nuxt DevTools) can re-skin the client
 * via `options.branding`, which is shallow-merged field-by-field over the
 * built-in {@link viteDevToolsBranding} defaults.
 */
export function createViteDevToolsUi(options: ViteDevToolsUiOptions = {}): DevframeHubUi {
  return createUi({
    branding: resolveBranding(options.branding),
    embeddedVisibility: options.embeddedVisibility,
    dockPreferences: options.dockPreferences,
  })
}

/**
 * Merge a host's branding overrides over the Vite DevTools defaults. Only keys
 * the host actually sets win; an explicit `undefined` is ignored so a partial
 * override never clobbers a default with a hole.
 */
function resolveBranding(overrides?: DevToolsBranding): DevframeBranding {
  const branding = viteDevToolsBranding()
  if (!overrides) {
    return branding
  }
  for (const key of Object.keys(overrides) as (keyof DevToolsBranding)[]) {
    const value = overrides[key]
    if (value !== undefined) {
      branding[key] = value as never
    }
  }
  return branding
}
