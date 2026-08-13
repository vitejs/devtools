import type { DevframeBranding } from '@devframes/hub-ui'
import type { DevframeHubUi } from '@devframes/hub/initiate'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createUi } from '@devframes/hub-ui'
import { dirAssets } from '../dirs'

/**
 * The Vite DevTools brand identity fed to `@devframes/hub-ui`. The reference
 * hub UI is headless about branding — it renders whatever `createUi({ branding })`
 * publishes — so this is the single place Vite DevTools' name, mark, and
 * primary color are defined for the served client (both the injected floating
 * dock and the standalone viewer).
 *
 * The primary color mirrors `@vitejs/devtools-ui`'s `primary.DEFAULT`, and the
 * mark is the "V+" logo shipped under `assets/branding/`. The logo and favicon
 * are inlined as `data:` URIs so they resolve without a network fetch — the
 * embedded dock is injected into arbitrary host pages where a relative asset
 * URL would not resolve.
 */
function svgDataUri(file: string): string {
  const svg = readFileSync(join(dirAssets, 'branding', file), 'utf-8')
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function viteDevToolsBranding(): DevframeBranding {
  const mark = svgDataUri('vite-devtools-mark.svg')
  return {
    productName: 'Vite DevTools',
    primaryColor: '#6b84fd',
    logo: mark,
    favicon: mark,
    tagline: 'Inspect and understand your Vite project.',
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
