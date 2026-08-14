import { fileURLToPath } from 'node:url'

export const dirDist: string = fileURLToPath(new URL('../dist', import.meta.url))

// Vendored integration marks (`rolldown.svg`, `vite.svg`, `vitest.svg`,
// `oxc.svg`) served at `/__devtools-assets/`, used as the icons for the
// built-in install launchers so they render before the integration's own
// package (and its served favicon) is installed. `../assets` is a sibling of
// both `src/` (dev) and `dist/` (published), so this resolves the same either
// way; the folder is shipped via the `assets` entry in `files`.
export const dirAssets: string = fileURLToPath(new URL('../assets', import.meta.url))

/**
 * The base path for the static assets that are shipped with Vite DevTools. These
 * assets are served from the DevTools hub at `/__devtools-assets/` and include the
 * Vite+ logo, the Vite DevTools branding wordmark, and the per-scheme light/dark
 * variants of the wordmark. The assets are vendored into the `@vitejs/devtools-kit`
 * package and are copied into the DevTools hub's static assets directory at build
 * time.
 */
export const DEVTOOLS_ASSETS_BASE = '/__devtools-assets/'
