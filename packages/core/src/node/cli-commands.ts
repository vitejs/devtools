/* eslint-disable no-console */

import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import { createServer } from 'node:http'
import c from 'ansis'
import { getPort } from 'get-port-please'
import { createApp, eventHandler, fromNodeMiddleware, sendRedirect, toNodeListener } from 'h3'
import open from 'open'
import { join, relative, resolve } from 'pathe'
import sirv from 'sirv'
import { dirClientStandalone } from '../dirs'
import { MARK_NODE } from './constants'
import { createDevToolsMiddleware } from './server'
import { startStandaloneDevTools } from './standalone'

export interface StartOptions {
  root: string
  config?: string
  host: string
  port: string | number
  open?: boolean
}

export async function start(options: StartOptions) {
  const host = options.host
  const port = await getPort({
    port: +options.port,
    portRange: [9999, 15000],
    host,
  })

  const devtools = await startStandaloneDevTools({
    cwd: options.root,
  })

  const { h3 } = await createDevToolsMiddleware({
    cwd: devtools.config.root,
    context: devtools.context,
  })

  const app = createApp()

  for (const { baseUrl, distDir } of devtools.context.views.buildStaticDirs) {
    app.use(baseUrl, fromNodeMiddleware(sirv(distDir, {
      dev: true,
      single: true,
    })))
  }

  app.use('/.devtools/', h3.handler)
  app.use('/', eventHandler(async (event) => {
    if (event.node.req.url === '/')
      return sendRedirect(event, '/.devtools/')
  }))

  const server = createServer(toNodeListener(app))

  server.listen(port, host, async () => {
    console.log(c.green`${MARK_NODE} Vite DevTools started at`, c.green(`http://${host === '127.0.0.1' ? 'localhost' : host}:${port}`), '\n')
    if (options.open)
      await open(`http://${host === '127.0.0.1' ? 'localhost' : host}:${port}`)
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

  const devtools = await startStandaloneDevTools({
    cwd: options.root,
    config: options.config,
  })

  const outDir = resolve(devtools.config.root, options.outDir)

  if (existsSync(outDir))
    await fs.rm(outDir, { recursive: true })

  const devToolsRoot = join(outDir, '.devtools')
  await fs.mkdir(devToolsRoot, { recursive: true })
  await fs.cp(dirClientStandalone, devToolsRoot, { recursive: true })

  for (const { baseUrl, distDir } of devtools.context.views.buildStaticDirs) {
    console.log(c.cyan`${MARK_NODE} Copying static files from ${distDir} to ${join(outDir, baseUrl)}`)
    await fs.mkdir(join(outDir, baseUrl), { recursive: true })
    await fs.cp(distDir, join(outDir, baseUrl), { recursive: true })
  }

  await fs.mkdir(resolve(devToolsRoot, 'api'), { recursive: true })
  await fs.writeFile(resolve(devToolsRoot, '.vdt-connection.json'), JSON.stringify({ backend: 'static' }, null, 2), 'utf-8')

  console.log(c.cyan`${MARK_NODE} Writing RPC dump to ${resolve(devToolsRoot, '.vdt-rpc-dump.json')}`)
  const dump: Record<string, any> = {}
  for (const [key, value] of Object.entries(devtools.context.rpc.functions)) {
    if (value.type === 'static')
      dump[key] = await value.handler?.()
  }
  await fs.writeFile(resolve(devToolsRoot, '.vdt-rpc-dump.json'), JSON.stringify(dump, null, 2), 'utf-8')

  console.log(c.green`${MARK_NODE} Built to ${relative(devtools.config.root, outDir)}`)

  throw new Error('[Vite DevTools] Build mode of Vite DevTools is not yet complete')
}
