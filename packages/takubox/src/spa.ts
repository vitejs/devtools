import type { DevtoolDefinition } from './types/devtool'

export interface BuildSpaOptions {
  outDir: string
  base?: string
}

/**
 * Build a deployable SPA bundle for a devtool. Unlike `buildStatic`,
 * this bundles `setupBrowser` into the client so the deployed app can
 * answer RPC in-browser without a server, and optionally accepts data
 * at runtime via the `spa.loader` mode (query / upload / none).
 */
export async function buildSpa(d: DevtoolDefinition, _options: BuildSpaOptions): Promise<void> {
  // Placeholder — full implementation bundles setupBrowser with
  // Rolldown, emits hashed assets, writes a query/upload loader
  // and an initial connection-meta pointing at the in-browser RPC.

  console.warn(`[takubox] buildSpa stub for "${d.id}" — not yet fully wired.`)
}
