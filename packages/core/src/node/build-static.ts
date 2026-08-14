/* eslint-disable no-console */

import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import { DOCK_RENDERERS_STATE_KEY } from '@devframes/hub/constants'
import { jsonRenderUiRenderer } from '@devframes/json-render-ui/hub'
import {
  DEVTOOLS_CONNECTION_META_FILENAME,
  DEVTOOLS_DIRNAME,
  DEVTOOLS_DOCK_IMPORTS_FILENAME,
  DEVTOOLS_MOUNT_PATH,
  DEVTOOLS_RPC_DUMP_DIRNAME,
  DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME,
} from '@vitejs/devtools-kit/constants'
import { colors as c } from 'devframe/utils/colors'
import { dirname, join, relative, resolve } from 'pathe'
import { MARK_NODE } from './constants'
import { createViteDevToolsUi } from './ui'

export interface BuildStaticOptions {
  context: ViteDevToolsNodeContext
  outDir: string
  withApp?: boolean
}

export async function buildStaticDevTools(options: BuildStaticOptions): Promise<void> {
  const { context, outDir, withApp } = options

  if (!withApp && existsSync(outDir))
    await fs.rm(outDir, { recursive: true })

  const devToolsRoot = join(outDir, DEVTOOLS_DIRNAME)
  await fs.mkdir(devToolsRoot, { recursive: true })

  // Bake the branded `@devframes/hub-ui` client into the snapshot: the
  // standalone viewer SPA, its embedded bootstrap, and the UI-owned assets
  // (e.g. `branding.json`) — the same `ui` slot the hub serves in dev.
  const ui = createViteDevToolsUi()
  if (ui.viewer)
    await fs.cp(ui.viewer.distDir, devToolsRoot, { recursive: true })
  if (ui.embedded)
    await fs.cp(ui.embedded.entry, join(devToolsRoot, 'embedded.js'))
  for (const [key, getContent] of Object.entries(ui.assets ?? {})) {
    const assetPath = join(devToolsRoot, key)
    await fs.mkdir(dirname(assetPath), { recursive: true })
    await fs.writeFile(assetPath, (getContent as () => string | Uint8Array)())
  }

  for (const { baseUrl, distDir } of context.views.buildStaticDirs) {
    console.log(c.cyan`${MARK_NODE} Copying static files from ${distDir} to ${join(outDir, baseUrl)}`)
    await fs.mkdir(join(outDir, baseUrl), { recursive: true })
    await fs.cp(distDir, join(outDir, baseUrl), { recursive: true })
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
  for (const registration of [jsonRenderUiRenderer()]) {
    await fs.cp(registration.file, resolve(renderersRoot, `${registration.type}.mjs`))
    rendererManifest[registration.type] = {
      importFrom: `${DEVTOOLS_MOUNT_PATH}__renderers/${registration.type}.mjs`,
    }
  }
  ;(await context.rpc.sharedState.get(DOCK_RENDERERS_STATE_KEY, { initialValue: {} })).mutate(() => rendererManifest)

  await fs.mkdir(resolve(devToolsRoot, DEVTOOLS_RPC_DUMP_DIRNAME), { recursive: true })
  await fs.writeFile(resolve(devToolsRoot, DEVTOOLS_CONNECTION_META_FILENAME), JSON.stringify({ backend: 'static' }, null, 2), 'utf-8')
  await fs.writeFile(resolve(devToolsRoot, DEVTOOLS_DOCK_IMPORTS_FILENAME), renderDockImportsMap(context.docks.values()), 'utf-8')

  console.log(c.cyan`${MARK_NODE} Writing RPC dump to ${resolve(devToolsRoot, DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME)}`)
  const { collectStaticRpcDump } = await import('devframe/rpc/dump')
  const dump = await collectStaticRpcDump(
    context.rpc.definitions.values(),
    context,
  )
  for (const [filepath, data] of Object.entries(dump.files)) {
    const fullpath = resolve(devToolsRoot, filepath)
    await fs.mkdir(dirname(fullpath), { recursive: true })
    await fs.writeFile(fullpath, JSON.stringify(data, null, 2), 'utf-8')
  }
  await fs.writeFile(resolve(devToolsRoot, DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME), JSON.stringify(dump.manifest, null, 2), 'utf-8')
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
        `  <meta http-equiv="refresh" content="0; url=${DEVTOOLS_MOUNT_PATH}">`,
        '</head>',
        '<body>',
        `  <script>location.replace(${JSON.stringify(DEVTOOLS_MOUNT_PATH)})</script>`,
        '</body>',
        '</html>',
      ].join('\n'),
      'utf-8',
    )
  }

  console.log(c.green`${MARK_NODE} Built DevTools to ${relative(context.cwd, outDir)}`)
}
