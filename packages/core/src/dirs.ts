import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const dirDist: string = fileURLToPath(new URL('../dist', import.meta.url))
export const dirClientStandalone: string = join(dirDist, 'client/standalone')

// Vendored integration marks (`rolldown.svg`, `vite.svg`, `vitest.svg`,
// `oxc.svg`) served at `/__devtools-assets/`, used as the icons for the
// built-in install launchers so they render before the integration's own
// package (and its served favicon) is installed. `../assets` is a sibling of
// both `src/` (dev) and `dist/` (published), so this resolves the same either
// way; the folder is shipped via the `assets` entry in `files`.
export const dirAssets: string = fileURLToPath(new URL('../assets', import.meta.url))
