/* eslint-disable no-console */

import type { DevToolsNodeContext } from '@vitejs/devtools-kit'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import {
  DEVTOOLS_CONNECTION_META_FILENAME,
  DEVTOOLS_DIRNAME,
  DEVTOOLS_DOCK_IMPORTS_FILENAME,
  DEVTOOLS_MOUNT_PATH,
  DEVTOOLS_RPC_DUMP_DIRNAME,
  DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME,
} from '@vitejs/devtools-kit/constants'
import c from 'ansis'
import { dirname, join, relative, resolve } from 'pathe'
import { dirClientStandalone } from '../dirs'
import { MARK_NODE } from './constants'

export interface BuildStaticOptions {
  context: DevToolsNodeContext
  outDir: string
  withApp?: boolean
}

export async function buildStaticDevTools(options: BuildStaticOptions): Promise<void> {
  const { context, outDir, withApp } = options

  if (!withApp && existsSync(outDir))
    await fs.rm(outDir, { recursive: true })

  const devToolsRoot = join(outDir, DEVTOOLS_DIRNAME)
  await fs.mkdir(devToolsRoot, { recursive: true })
  await fs.cp(dirClientStandalone, devToolsRoot, { recursive: true })

  for (const { baseUrl, distDir } of context.views.buildStaticDirs) {
    console.log(c.cyan`${MARK_NODE} Copying static files from ${distDir} to ${join(outDir, baseUrl)}`)
    await fs.mkdir(join(outDir, baseUrl), { recursive: true })
    await fs.cp(distDir, join(outDir, baseUrl), { recursive: true })
  }

  const { renderDockImportsMap } = await import('./plugins/server')

  await fs.mkdir(resolve(devToolsRoot, DEVTOOLS_RPC_DUMP_DIRNAME), { recursive: true })
  await fs.writeFile(resolve(devToolsRoot, DEVTOOLS_CONNECTION_META_FILENAME), JSON.stringify({ backend: 'static' }, null, 2), 'utf-8')
  await fs.writeFile(resolve(devToolsRoot, DEVTOOLS_DOCK_IMPORTS_FILENAME), renderDockImportsMap(context.docks.values()), 'utf-8')

  console.log(c.cyan`${MARK_NODE} Writing RPC dump to ${resolve(devToolsRoot, DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME)}`)
  const { collectStaticRpcDump } = await import('devframe/node')
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
