import type { DevframeBranding } from '@devframes/hub-ui'
import type { DevframeHubUi } from '@devframes/hub/initiate'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createUi } from '@devframes/hub-ui'
import { dirAssets } from '../dirs'

type BrandingLogo = NonNullable<DevframeBranding['logo']>

/**
 * The Vite DevTools brand identity fed to `@devframes/hub-ui`. The reference
 * hub UI is headless about branding — it renders whatever `createUi({ branding })`
 * publishes — so this is the single place Vite DevTools' name, mark, and
 * primary color are defined for the served client (both the injected floating
 * dock and the standalone viewer).
 *
 * The mark + wordmark are the official Vite+ brand assets
 * (github.com/voidzero-dev/community-design-resources), inlined as `data:`
 * URIs so they resolve without a network fetch — the embedded dock is injected
 * into arbitrary host pages where a relative asset URL would not resolve — and
 * shipped with per-scheme light/dark variants.
 */
function svgDataUri(file: string): string {
  const svg = readFileSync(join(dirAssets, 'branding', file), 'utf-8')
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function brandingLogo(light: string, dark: string): BrandingLogo {
  return { light: svgDataUri(light), dark: svgDataUri(dark) }
}

export function viteDevToolsBranding(): DevframeBranding {
  return {
    productName: 'Vite DevTools',
    primaryColor: '#6b84fd',
    logo: brandingLogo('vite+-icon-color-light.svg', 'vite+-icon-color-dark.svg'),
    wordmark: brandingLogo('vite+-logo-color-light.svg', 'vite+-logo-color-dark.svg'),
    favicon: svgDataUri('vite+-icon-color-light.svg'),
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
