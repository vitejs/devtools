/* eslint-disable no-console */

import type { DockRendererRegistration, ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import type { ViteDevToolsUiOptions } from './ui'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import { DOCK_RENDERERS_STATE_KEY } from '@devframes/hub/constants'
import {
  DEVTOOLS_CONNECTION_META_FILENAME,
  DEVTOOLS_DIRNAME,
  DEVTOOLS_DOCK_IMPORTS_FILENAME,
  DEVTOOLS_MOUNT_PATH,
  DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME,
} from '@vitejs/devtools-kit/constants'
import { colors as c } from 'devframe/utils/colors'
import { resolveStaticAssetsSource } from 'devframe/utils/remote-assets'
import { dirname, join, relative, resolve } from 'pathe'
import { MARK_NODE } from './constants'
import { resolveDockRendererRegistrations } from './renderers'
import { createViteDevToolsUi } from './ui'

export interface BuildStaticOptions {
  context: ViteDevToolsNodeContext
  outDir: string
  /**
   * Absolute path the snapshot is deployed under (e.g. `/ci-build-123456/`).
   * Prefixes the root-relative URLs baked into the output — the root redirect
   * and the dock-renderer import specifiers — so the snapshot works when hosted
   * below the domain root. Defaults to `/`.
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

  const devToolsRoot = join(outDir, DEVTOOLS_DIRNAME)
  await fs.mkdir(devToolsRoot, { recursive: true })

  // Bake the branded `@devframes/hub-ui` client into the snapshot: the
  // standalone viewer SPA, its embedded bootstrap, and the UI-owned assets
  // (e.g. `branding.json`) — the same `ui` slot the hub serves in dev.
  const ui = createViteDevToolsUi(options.ui)
  if (ui.viewer)
    await fs.cp(ui.viewer.distDir, devToolsRoot, { recursive: true })
  if (ui.embedded)
    await fs.cp(ui.embedded.entry, join(devToolsRoot, 'embedded.js'))
  for (const [key, getContent] of Object.entries(ui.assets ?? {})) {
    const assetPath = join(devToolsRoot, key)
    await fs.mkdir(dirname(assetPath), { recursive: true })
    await fs.writeFile(assetPath, (getContent as () => string | Uint8Array)())
  }

  const projectStorageDir = context.host.getStorageDir('project')
  for (const { baseUrl, source, resolveFrom } of context.views.buildStaticDirs) {
    const targetDir = join(outDir, baseUrl)
    await fs.mkdir(targetDir, { recursive: true })
    // Re-resolve each source from the base it was mounted with, mirroring the
    // hub's `buildHub`: a plugin's remote `--assets` bundle must resolve against
    // that plugin's dependency graph (its `importMetaUrl`) to hit the
    // locally-installed copy, not core's back-proxy CDN cache (a stale SPA).
    const resolved = resolveStaticAssetsSource(source, projectStorageDir, resolveFrom)
    if (typeof resolved === 'string') {
      console.log(c.cyan`${MARK_NODE} Copying static files from ${resolved} to ${targetDir}`)
      await fs.cp(resolved, targetDir, { recursive: true })
    }
    else {
      console.log(c.cyan`${MARK_NODE} Downloading remote static files to ${targetDir}`)
      await resolved.materialize(targetDir)
    }
  }

  const { renderDockImportsMap } = await import('./plugins/server')

  // Bake the reference json-render renderer the live hub serves via
  // `initHub({ renderers })`: copy its prebuilt module under `__renderers/`
  // and seed the dock-renderer manifest shared state so (a) the static RPC
  // dump has a match for `server-state:get(["devframe:dock-renderers"])`
  // instead of a hard error, and (b) the client lazily imports it the first
  // time a `json-render` dock mounts.
  const rendererManifest: Record<string, { importFrom: string, importName?: string }> = {}
  const renderersRoot = resolve(devToolsRoot, '__renderers')
  await fs.mkdir(renderersRoot, { recursive: true })
  for (const registration of resolveDockRendererRegistrations(options.renderers)) {
    await fs.cp(registration.file, resolve(renderersRoot, `${registration.type}.mjs`))
    rendererManifest[registration.type] = {
      importFrom: `${mountPath}__renderers/${registration.type}.mjs`,
    }
  }
  ;(await context.rpc.sharedState.get(DOCK_RENDERERS_STATE_KEY, { initialValue: {} })).mutate(() => rendererManifest)

  // Fire the services collect-then-setup barrier `initHub` runs in dev. The
  // live hub isn't stood up for a static snapshot, so nothing else seeds the
  // `devframe:services` shared state the client reads on load — without this,
  // the RPC dump has no match for `server-state:get(["devframe:services"])`
  // and the client logs a hard error. `ready()` always publishes the state
  // (empty when no services are installed) and is idempotent.
  await context.services.ready()

  // Mirror devframe's `createBuild` / hub `buildHub` connection meta: the
  // `backend: 'static'` marker plus the JSON-serializable method allow-list
  // the client uses to pick a wire encoder.
  const jsonSerializableMethods: string[] = []
  for (const def of context.rpc.definitions.values()) {
    if (def.jsonSerializable === true)
      jsonSerializableMethods.push(def.name)
  }
  await fs.writeFile(resolve(devToolsRoot, DEVTOOLS_CONNECTION_META_FILENAME), JSON.stringify({ backend: 'static', jsonSerializableMethods }, null, 2), 'utf-8')
  await fs.writeFile(resolve(devToolsRoot, DEVTOOLS_DOCK_IMPORTS_FILENAME), renderDockImportsMap(context.docks.values()), 'utf-8')

  console.log(c.cyan`${MARK_NODE} Writing RPC dump to ${resolve(devToolsRoot, DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME)}`)
  const { collectStaticRpcDump, writeStaticRpcDump } = await import('devframe/rpc/dump')
  const dump = await collectStaticRpcDump(context.rpc.definitions.values(), context)
  await writeStaticRpcDump(dump, devToolsRoot)
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
