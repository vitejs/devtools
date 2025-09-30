import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import { createServer } from 'node:http'
import process from 'node:process'
import c from 'ansis'
import cac from 'cac'
import { getPort } from 'get-port-please'
import { createApp, eventHandler, sendRedirect, toNodeListener } from 'h3'
import open from 'open'
import { join, relative, resolve } from 'pathe'
import { dirClientStandalone } from '../dirs'
import { MARK_NODE } from './constants'
import { createDevToolsMiddleware } from './server'
import { startStandaloneDevTools } from './standalone'

const cli = cac('vite-devtools')

process.on('SIGINT', () => {
  process.exit(0)
})

cli
  .command('build', 'Build devtools with current config file for static hosting')
  .option('--root <root>', 'Root directory', { default: process.cwd() })
  .option('--config <config>', 'Vite config file')
  // Build specific options
  .option('--base <baseURL>', 'Base URL for deployment', { default: '/' })
  .option('--outDir <dir>', 'Output directory', { default: '.vite-devtools' })
  // Action
  .action(async (options) => {
    console.log(c.cyan`${MARK_NODE} Building static Vite DevTools...`)

    const devtools = await startStandaloneDevTools({
      cwd: options.root,
      config: options.config,
    })

    const outDir = resolve(devtools.config.root, options.outDir)

    if (existsSync(outDir))
      await fs.rm(outDir, { recursive: true })

    const devToolsRoot = join(outDir, '__vite_devtools__')
    await fs.mkdir(devToolsRoot, { recursive: true })
    await fs.cp(dirClientStandalone, devToolsRoot, { recursive: true })

    for (const { baseUrl, distDir } of devtools.context.staticDirs) {
      console.log(c.cyan`${MARK_NODE} Copying static files from ${distDir} to ${join(outDir, baseUrl)}`)
      await fs.mkdir(join(outDir, baseUrl), { recursive: true })
      await fs.cp(distDir, join(outDir, baseUrl), { recursive: true })
    }

    await fs.mkdir(resolve(devToolsRoot, 'api'), { recursive: true })
    await fs.writeFile(resolve(devToolsRoot, 'api/connection.json'), JSON.stringify({ backend: 'static' }, null, 2), 'utf-8')

    console.log(c.cyan`${MARK_NODE} Writing RPC dump to ${resolve(devToolsRoot, 'api/rpc-dump.json')}`)
    const dump: Record<string, any> = {}
    for (const [key, value] of Object.entries(devtools.context.rpc.functions)) {
      if (value.type === 'static')
        dump[key] = await value.handler?.()
    }
    await fs.writeFile(resolve(devToolsRoot, 'api/rpc-dump.json'), JSON.stringify(dump, null, 2), 'utf-8')

    console.log(c.green`${MARK_NODE} Built to ${relative(devtools.config.root, outDir)}`)

    throw new Error('[Vite DevTools] Build mode of Vite DevTools is not yet complete')
  })

cli
  .command('', 'Start devtools')
  .option('--root <root>', 'Root directory', { default: process.cwd() })
  .option('--config <config>', 'Vite config file')
  // Dev specific options
  .option('--host <host>', 'Host', { default: process.env.HOST || '127.0.0.1' })
  .option('--port <port>', 'Port', { default: process.env.PORT || 9999 })
  .option('--open', 'Open browser', { default: true })
  // Action
  .action(async (options) => {
    const host = options.host
    const port = await getPort({
      port: options.port,
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
    app.use('/__vite_devtools__', h3.handler)
    app.use('/', eventHandler(async (event) => {
      return sendRedirect(event, '/__vite_devtools__/')
    }))

    const server = createServer(toNodeListener(app))

    server.listen(port, host, async () => {
      console.log(c.green`${MARK_NODE} Vite DevTools started at`, c.green(`http://${host === '127.0.0.1' ? 'localhost' : host}:${port}`), '\n')
      if (options.open)
        await open(`http://${host === '127.0.0.1' ? 'localhost' : host}:${port}`)
    })
  })

cli.help()
cli.parse()
