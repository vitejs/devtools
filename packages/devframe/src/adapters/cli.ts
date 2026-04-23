import type { DevtoolDefinition } from '../types/devtool'
import process from 'node:process'
import c from 'ansis'
import cac from 'cac'
import { getPort } from 'get-port-please'
import { createApp } from 'h3'
import { resolve } from 'pathe'
import sirv from 'sirv'
import { DEVTOOLS_MOUNT_PATH } from '../constants'
import { createHostContext } from '../node/context'
import { createH3DevToolsHost } from '../node/host-h3'
import { startHttpAndWs } from '../node/server'
import { buildStatic } from './build'
import { buildSpa } from './spa'

export interface CreateCliOptions {
  /** Default port for `dev` (default: 9999). */
  defaultPort?: number
}

export interface CliHandle {
  parse: (argv?: string[]) => Promise<void>
}

export function createCli(d: DevtoolDefinition, options: CreateCliOptions = {}): CliHandle {
  const defaultPort = options.defaultPort ?? d.cli?.port ?? 9999
  const command = d.cli?.command ?? d.id

  const cli = cac(command)

  cli
    .command('[...args]', 'Start a local dev server')
    .option('--port <port>', 'Port to listen on')
    .option('--host <host>', 'Host to bind to', { default: 'localhost' })
    .action(async (_args: unknown, flags: { port?: number, host?: string }) => {
      const host = flags.host ?? 'localhost'
      const port = flags.port ?? await getPort({ port: defaultPort, host })
      await runDevServer(d, { host, port })
    })

  cli
    .command('build', 'Build a static snapshot')
    .option('--out-dir <outDir>', 'Output directory', { default: 'dist-static' })
    .option('--base <base>', 'URL base', { default: '/' })
    .action(async (flags: { outDir: string, base?: string }) => {
      await buildStatic(d, { outDir: flags.outDir, base: flags.base })
    })

  cli
    .command('spa', 'Build a deployable SPA bundle')
    .option('--out-dir <outDir>', 'Output directory', { default: 'dist-spa' })
    .option('--base <base>', 'URL base', { default: '/' })
    .action(async (flags: { outDir: string, base?: string }) => {
      await buildSpa(d, { outDir: flags.outDir, base: flags.base })
    })

  cli.help()
  cli.version('0.0.0')

  return {
    async parse(argv = process.argv) {
      cli.parse(argv, { run: false })
      await cli.runMatchedCommand()
    },
  }
}

interface DevServerOptions {
  host: string
  port: number
}

async function runDevServer(d: DevtoolDefinition, options: DevServerOptions): Promise<void> {
  const distDir = d.cli?.distDir
  if (!distDir)
    throw new Error(`[devframe] dev: no cli.distDir for "${d.id}". Set \`cli.distDir\` on the definition.`)

  const app = createApp()
  const origin = `http://${options.host}:${options.port}`

  const host = createH3DevToolsHost({
    origin,
    mount: (base, dir) => {
      app.use(base, sirv(dir, { dev: true, single: true }) as any)
    },
  })

  const ctx = await createHostContext({
    cwd: process.cwd(),
    mode: 'dev',
    host,
  })
  await d.setup(ctx)

  app.use(DEVTOOLS_MOUNT_PATH, sirv(resolve(distDir), { dev: true, single: true }) as any)

  await startHttpAndWs({
    context: ctx,
    host: options.host,
    port: options.port,
    app,
    onReady: ({ origin }) => {
      console.log(c.green`[devframe] "${d.id}" dev server ready at ${origin}${DEVTOOLS_MOUNT_PATH}`)
    },
  })
}
