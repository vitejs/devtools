import type { DevtoolDefinition } from './types/devtool'

export interface BuildStaticOptions {
  outDir: string
  base?: string
}

/**
 * Produce a static-dump snapshot of a devtool's RPC output + copied
 * SPA bundle. The full implementation mirrors
 * `@vitejs/devtools`' `build-static.ts`; this shell keeps the API
 * stable while the port lands.
 */
export async function buildStatic(d: DevtoolDefinition, _options: BuildStaticOptions): Promise<void> {
  // Placeholder — will construct a `runtime: 'build'` context via
  // `createHostContext`, run `d.setup(ctx)`, collect RPC dumps for
  // `'static'` functions, write connection-meta + dump files, copy
  // the SPA dist, rewrite base URLs.

  console.warn(`[takubox] buildStatic stub for "${d.id}" — not yet fully wired.`)
}
