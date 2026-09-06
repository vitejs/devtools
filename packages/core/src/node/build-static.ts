/* eslint-disable no-console */

import type { DockRendererRegistration, ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import type { ViteDevToolsUiOptions } from './ui'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import { buildHub } from '@devframes/hub/build'
import { DEVTOOLS_DIRNAME, DEVTOOLS_MOUNT_PATH } from '@vitejs/devtools-kit/constants'
import { colors as c } from 'devframe/utils/colors'
import { join, relative, resolve } from 'pathe'
import { MARK_NODE } from './constants'
import { resolveDockRendererRegistrations } from './renderers'
import { createViteDevToolsUi } from './ui'

export interface BuildStaticOptions {
  context: ViteDevToolsNodeContext
  outDir: string
  /**
   * Absolute path the snapshot is deployed under (e.g. `/ci-build-123456/`).
   * Prefixes the root-relative URLs baked into the output — the root redirect
   * and the hub's own absolute specifiers (renderer imports, per-frame meta
   * pointers) — so the snapshot works when hosted below the domain root.
   * Defaults to `/`.
   */
  base?: string
  /** Dock renderer modules copied into the static output, replacing built-ins by matching type. */
  renderers?: readonly DockRendererRegistration[]
  withApp?: boolean
  /** Reference-UI options forwarded to `createUi`. */
  ui?: ViteDevToolsUiOptions
}

/**
 * Join the deploy `base` with the kit-pinned `/__devtools/` mount so absolute
 * URLs in the snapshot point at the right place when hosted below the domain
 * root. `/` (the default) collapses to the bare mount path.
 */
function resolveMountPath(base: string): string {
  const prefix = base.replace(/\/+$/, '')
  return prefix ? `${prefix}${DEVTOOLS_MOUNT_PATH}` : DEVTOOLS_MOUNT_PATH
}

export async function buildStaticDevTools(options: BuildStaticOptions): Promise<void> {
  const { context, outDir, withApp } = options
  const mountPath = resolveMountPath(options.base ?? '/')

  if (!withApp && existsSync(outDir))
    await fs.rm(outDir, { recursive: true })

  // Fire the services collect-then-setup barrier `initHub` runs in dev, so the
  // `devframe:services` shared state the client reads on load is seeded (empty
  // when none are installed) before `buildHub` bakes the RPC dump. Idempotent.
  await context.services.ready()

  // Bake through the hub's own static builder — the `buildHub` counterpart of
  // the live `initHub` in `createDevToolsHub`. It reuses our already-mounted
  // kit context and emits the whole snapshot: the branded `ui` slot's viewer +
  // `embedded.js`, each devframe SPA and the vendored assets from
  // `context.views.buildStaticDirs`, the dock renderers, the discovery
  // documents (`__index.json`, `__client-imports.js`), the `backend: 'static'`
  // connection metas (hub + per-frame), and the RPC dump. The hub subtree lands
  // at `<outDir>/__devtools/`; the devframe SPAs and assets are root-level
  // siblings, resolved against the deploy root (`buildHub`'s `outDir` parent).
  await buildHub({
    context,
    outDir: join(outDir, DEVTOOLS_DIRNAME),
    base: mountPath,
    ui: createViteDevToolsUi(options.ui),
    renderers: resolveDockRendererRegistrations(options.renderers),
    // We own the deploy-root lifecycle (the `!withApp` wipe above); leave any
    // sibling app output in place.
    clean: false,
  })

  // Vite DevTools' standalone entry: a root redirect into the hub mount so the
  // deploy root opens the viewer. Skipped when an app already owns index.html.
  if (!existsSync(resolve(outDir, 'index.html'))) {
    await fs.writeFile(
      resolve(outDir, 'index.html'),
      [
        '<!doctype html>',
        '<html lang="en">',
        '<head>',
        '  <meta charset="UTF-8">',
        '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '  <title>Vite DevTools</title>',
        `  <meta http-equiv="refresh" content="0; url=${mountPath}">`,
        '</head>',
        '<body>',
        `  <script>location.replace(${JSON.stringify(mountPath)})</script>`,
        '</body>',
        '</html>',
      ].join('\n'),
      'utf-8',
    )
  }

  console.log(c.green`${MARK_NODE} Built DevTools to ${relative(context.cwd, outDir)}`)
}
