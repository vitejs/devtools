import type { ServerFunctionsDump } from './rpc'
import { existsSync } from 'node:fs'

import fs from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'
import c from 'ansis'
import cac from 'cac'
import { getPort } from 'get-port-please'
import open from 'open'
import { relative, resolve } from 'pathe'
import { stringify } from 'structured-clone-es'
import { glob } from 'tinyglobby'
import { distDir } from '../dirs'
import { MARK_CHECK, MARK_NODE } from './constants'
import { RolldownLogsManager } from './rolldown/logs-manager'
import { createHostServer } from './server'

const cli = cac('vite-devtools')

cli
  .command('build', 'Build devtools with current config file for static hosting')
  .option('--root <root>', 'Root directory', { default: process.cwd() })
  .option('--config <config>', 'Config file')
  .option('--depth <depth>', 'Max depth to list dependencies', { default: 8 })
  // Build specific options
  .option('--base <baseURL>', 'Base URL for deployment', { default: '/' })
  .option('--outDir <dir>', 'Output directory', { default: '.vite-devtools' })
  // Action
  .action(async (options) => {
    console.log(c.cyan`${MARK_NODE} Building static Vite DevTools...`)

    const cwd = process.cwd()
    const outDir = resolve(cwd, options.outDir)

    const rpc = await import('./functions')
      .then(async r => await r.createServerFunctions({
        cwd,
        mode: 'build',
        // TODO: redesign how the manager is passed
        meta: {
          manager: new RolldownLogsManager(join(cwd, '.rolldown')),
        },
      }))
    const rpcDump: ServerFunctionsDump = {
      'vite:get-payload': await rpc['vite:get-payload'](),
    }

    let baseURL = options.base
    if (!baseURL.endsWith('/'))
      baseURL += '/'
    if (!baseURL.startsWith('/'))
      baseURL = `/${baseURL}`
    baseURL = baseURL.replace(/\/+/g, '/')

    if (existsSync(outDir))
      await fs.rm(outDir, { recursive: true })
    await fs.mkdir(outDir, { recursive: true })
    await fs.cp(distDir, outDir, { recursive: true })
    const htmlFiles = await glob('**/*.html', { cwd: distDir, onlyFiles: true, dot: true, expandDirectories: false })
    // Rewrite HTML files with base URL
    if (baseURL !== '/') {
      for (const file of htmlFiles) {
        const content = await fs.readFile(resolve(distDir, file), 'utf-8')
        const newContent = content
          .replaceAll(/\s(href|src)="\//g, ` $1="${baseURL}`)
          .replaceAll('baseURL:"/"', `baseURL:"${baseURL}"`)
        await fs.writeFile(resolve(outDir, file), newContent, 'utf-8')
      }
    }

    await fs.mkdir(resolve(outDir, 'api'), { recursive: true })
    await fs.writeFile(resolve(outDir, 'api/metadata.json'), JSON.stringify({ backend: 'static' }, null, 2), 'utf-8')
    await fs.writeFile(resolve(outDir, 'api/rpc-dump.json'), stringify(rpcDump), 'utf-8')

    console.log(c.green`${MARK_CHECK} Built to ${relative(cwd, outDir)}`)
    console.log(c.blue`${MARK_NODE} You can use static server like \`npx serve ${relative(cwd, outDir)}\` to serve the devtools`)
  })

cli
  .command('', 'Start devtools')
  .option('--root <root>', 'Root directory', { default: process.cwd() })
  .option('--config <config>', 'Config file')
  .option('--depth <depth>', 'Max depth to list dependencies', { default: 8 })
  // Dev specific options
  .option('--host <host>', 'Host', { default: process.env.HOST || '127.0.0.1' })
  .option('--port <port>', 'Port', { default: process.env.PORT || 9999 })
  .option('--open', 'Open browser', { default: true })
  // Action
  .action(async (options) => {
    const host = options.host
    const port = await getPort({ port: options.port, portRange: [9999, 15000], host })

    console.log(c.green`${MARK_NODE} Starting Vite DevTools at`, c.green(`http://${host === '127.0.0.1' ? 'localhost' : host}:${port}`), '\n')

    const { server, rpc } = await createHostServer({
      cwd: options.root,
      mode: 'dev',
      // TODO: redesign how the manager is passed
      meta: {
        manager: new RolldownLogsManager(join(options.root, '.rolldown')),
      },
    })

    // Warm up the payload
    setTimeout(() => {
      rpc.functions['vite:get-payload']()
    }, 1)

    server.listen(port, host, async () => {
      if (options.open)
        await open(`http://${host === '127.0.0.1' ? 'localhost' : host}:${port}`)
    })
  })

cli.help()
cli.parse()
