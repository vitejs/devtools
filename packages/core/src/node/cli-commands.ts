/* eslint-disable no-console */

import {
  DEVTOOLS_MOUNT_PATH,
} from '@vitejs/devtools-kit/constants'
import c from 'ansis'
import { resolve } from 'pathe'
import { MARK_NODE } from './constants'
import { logger } from './diagnostics'
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
    websocket: {
      host,
      https: false,
    },
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

  const { buildStaticDevTools } = await import('./build-static')
  await buildStaticDevTools({
    context: devtools.context,
    outDir,
  })

  logger.DTK0010().log()
}
