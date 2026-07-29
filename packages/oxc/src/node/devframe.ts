import { existsSync } from 'node:fs'
import { defineDevframe } from 'devframe/types'
import { rpcFunctions } from './rpc'
import { clientPublicDir } from '../dirs'
import { description, homepage, name, version } from '../../package.json'

/** Mount path for the oxc SPA, shared by the hosted and standalone adapters. */
export const OXC_DEVTOOLS_BASE = '/__devtools-oxc/'

/**
 * Portable {@link defineDevframe} definition for the Oxc DevTools. The same
 * definition powers two runtimes:
 *
 * - **embedded** in Vite DevTools via kit's `createPluginFromDevframe`
 *   (see `../vite.ts`), and
 * - **standalone** via devframe's `createDevServer` (see `../../index.ts`).
 *
 * `setup(ctx)` only registers RPC functions — the SPA hosting and dock entry
 * are derived from this metadata by the respective adapter.
 */
export const oxcDevframe = defineDevframe({
  id: 'devtools-oxc',
  name: 'Oxc',
  version,
  packageName: name,
  homepage,
  description,
  icon: `${OXC_DEVTOOLS_BASE}favicon.svg`,
  basePath: OXC_DEVTOOLS_BASE,
  cli: {
    command: 'oxc-devtools',
    // Serve the prebuilt Nuxt SPA when it exists (packaged builds); in client
    // dev mode the Nuxt dev server owns the UI, so leave it unset.
    distDir: existsSync(clientPublicDir) ? clientPublicDir : undefined,
    // Single-user localhost tool — skip the RPC trust handshake.
    auth: false,
  },
  setup(ctx) {
    for (const fn of rpcFunctions) {
      ctx.rpc.register(fn as any)
    }
  },
})
