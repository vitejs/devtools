/* eslint-disable no-console */

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
import { normalizeHttpServerUrl } from './utils'

export interface StartOptions {
  root?: string
  config?: string
  host: string
  port?: string | number
  open?: boolean
}

export async function start(options: StartOptions) {
  const { host } = options
  const { getPort } = await import('get-port-please')
  const port = await getPort({
    host,
    port: options.port == null ? undefined : +options.port,
    portRange: [9999, 15000],
  })

  const { startStandaloneDevTools } = await import('./standalone')
  const { createDevToolsMiddleware } = await import('./server')

  const devtools = await startStandaloneDevTools({
    cwd: options.root,
  })
  const { h3 } = await createDevToolsMiddleware({
    cwd: devtools.config.root,
    hostWebSocket: host,
    context: devtools.context,
  })

  const { createServer } = await import('node:http')
  const { createApp, eventHandler, fromNodeMiddleware, sendRedirect, toNodeListener } = await import('h3')
  const { default: sirv } = await import('sirv')

  const app = createApp()

  for (const { baseUrl, distDir } of devtools.context.views.buildStaticDirs) {
    app.use(baseUrl, fromNodeMiddleware(sirv(distDir, {
      dev: true,
      single: true,
    })))
  }

  app.use(DEVTOOLS_MOUNT_PATH, h3.handler)
  app.use('/', eventHandler(async (event) => {
    if (event.node.req.url === '/')
      return sendRedirect(event, DEVTOOLS_MOUNT_PATH)
  }))

  const server = createServer(toNodeListener(app))

  server.listen(port, host, async () => {
    const url = normalizeHttpServerUrl(host, port)
    console.log(c.green`${MARK_NODE} Vite DevTools started at`, c.green(url), '\n')
    const { default: open } = await import('open')
    if (options.open)
      await open(url)
  })
}

export interface BuildOptions {
  root: string
  config?: string
  outDir: string
  base: string
}

export async function build(options: BuildOptions) {
  console.log(c.cyan`${MARK_NODE} Building static Vite DevTools...`)

  const { startStandaloneDevTools } = await import('./standalone')
  const devtools = await startStandaloneDevTools({
    cwd: options.root,
    config: options.config,
  })

  const outDir = resolve(devtools.config.root, options.outDir)

  if (existsSync(outDir))
    await fs.rm(outDir, { recursive: true })

  const devToolsRoot = join(outDir, DEVTOOLS_DIRNAME)
  await fs.mkdir(devToolsRoot, { recursive: true })
  await fs.cp(dirClientStandalone, devToolsRoot, { recursive: true })

  for (const { baseUrl, distDir } of devtools.context.views.buildStaticDirs) {
    console.log(c.cyan`${MARK_NODE} Copying static files from ${distDir} to ${join(outDir, baseUrl)}`)
    await fs.mkdir(join(outDir, baseUrl), { recursive: true })
    await fs.cp(distDir, join(outDir, baseUrl), { recursive: true })
  }

  const { renderDockImportsMap } = await import('./plugins/server')

  await fs.mkdir(resolve(devToolsRoot, DEVTOOLS_RPC_DUMP_DIRNAME), { recursive: true })
  await fs.writeFile(resolve(devToolsRoot, DEVTOOLS_CONNECTION_META_FILENAME), JSON.stringify({ backend: 'static' }, null, 2), 'utf-8')
  await fs.writeFile(resolve(devToolsRoot, DEVTOOLS_DOCK_IMPORTS_FILENAME), renderDockImportsMap(devtools.context.docks.values()), 'utf-8')

  console.log(c.cyan`${MARK_NODE} Writing RPC dump to ${resolve(devToolsRoot, DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME)}`)
  const { collectStaticRpcDump } = await import('./static-dump')
  const dump = await collectStaticRpcDump(
    devtools.context.rpc.definitions.values(),
    devtools.context,
  )
  for (const [filepath, data] of Object.entries(dump.files)) {
    const fullpath = resolve(devToolsRoot, filepath)
    await fs.mkdir(dirname(fullpath), { recursive: true })
    await fs.writeFile(fullpath, JSON.stringify(data, null, 2), 'utf-8')
  }
  await fs.writeFile(resolve(devToolsRoot, DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME), JSON.stringify(dump.manifest, null, 2), 'utf-8')
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

  console.log(c.green`${MARK_NODE} Built to ${relative(devtools.config.root, outDir)}`)
  console.warn(c.yellow`${MARK_NODE} Static build is still experimental and not yet complete.`)
  console.warn(c.yellow`${MARK_NODE} Generated output may be missing features and can change without notice.`)
}
