/* eslint-disable no-console */

import { DEVTOOLS_MOUNT_PATH } from '@vitejs/devtools-kit/constants'
import { normalizeHttpServerUrl } from 'devframe/internal'
import { colors as c } from 'devframe/utils/colors'
import { open } from 'devframe/utils/open'
import { resolve } from 'pathe'
import { MARK_NODE } from './constants'
import { diagnostics } from './diagnostics'

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
  const { createDevToolsHub } = await import('./server')

  const devtools = await startStandaloneDevTools({
    cwd: options.root,
  })

  // Standalone has no shared HTTP server for the WS upgrade, so the hub opens
  // a side-car WS server (advertised in `__connection.json`). Its middleware
  // answers the whole `/__devtools/` surface — the branded hub-ui viewer, the
  // connection meta, and the client bundles.
  const { middleware } = await createDevToolsHub({
    context: devtools.context,
    host,
  })

  const { createServer } = await import('node:http')
  const { defineHandler, H3, sendRedirect, toNodeHandler } = await import('h3')
  const { mountStaticHandler } = await import('devframe/utils/serve-static')
  const { resolveStaticAssetsSource } = await import('devframe/utils/remote-assets')

  const app = new H3()

  const projectStorageDir = devtools.context.host.getStorageDir('project')
  for (const { baseUrl, source } of devtools.context.views.buildStaticDirs)
    mountStaticHandler(app, baseUrl, resolveStaticAssetsSource(source, projectStorageDir))

  app.use('/', defineHandler(event => sendRedirect(event, DEVTOOLS_MOUNT_PATH, 302)))

  const appHandler = toNodeHandler(app)
  // Hub first (owns `/__devtools/*`); anything outside its base falls through
  // to the sub-frame statics + the root redirect.
  const server = createServer((req, res) => {
    middleware(req, res, () => appHandler(req, res))
  })

  server.listen(port, host, async () => {
    const url = normalizeHttpServerUrl(host, port)
    console.log(c.green`${MARK_NODE} Vite DevTools started at`, c.green(url), '\n')
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

  const { buildStaticDevTools } = await import('./build-static')
  await buildStaticDevTools({
    context: devtools.context,
    outDir,
  })

  diagnostics.DTK0010()
}
