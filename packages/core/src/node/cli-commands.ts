/* eslint-disable no-console */

import {
  DEVTOOLS_MOUNT_PATH,
  DEVTOOLS_MOUNT_PATH_NO_TRAILING_SLASH,
} from '@vitejs/devtools-kit/constants'
import { normalizeHttpServerUrl } from 'devframe/node'
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
  const { defineHandler, H3, sendRedirect, toNodeHandler } = await import('h3')
  const { mountStaticHandler } = await import('devframe/utils/serve-static')

  const app = new H3()

  for (const { baseUrl, distDir } of devtools.context.views.buildStaticDirs)
    mountStaticHandler(app, baseUrl, distDir)

  app.use(DEVTOOLS_MOUNT_PATH_NO_TRAILING_SLASH, h3)
  app.use('/', defineHandler(event => sendRedirect(event, DEVTOOLS_MOUNT_PATH, 302)))

  const server = createServer(toNodeHandler(app))

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

export interface McpOptions {
  root?: string
}

export async function mcp(options: McpOptions) {
  const { startMcpServer } = await import('./mcp')
  await startMcpServer(options)
}
