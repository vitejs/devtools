import type { CAC } from 'cac'
import type { App } from 'h3'
import type { DevtoolDefinition, DevtoolSetupInfo } from '../types/devtool'
import process from 'node:process'
import cac from 'cac'
import { getPort } from 'get-port-please'
import { createApp } from 'h3'
import { resolve } from 'pathe'
import sirv from 'sirv'
import { createHostContext } from '../node/context'
import { createH3DevToolsHost } from '../node/host-h3'
import { startHttpAndWs } from '../node/server'
import { resolveBasePath } from './_shared'
import { createBuild } from './build'
import { createSpa } from './spa'

export interface CreateCliOptions {
  /** Default port for `dev` (default: 9999). */
  defaultPort?: number
  /**
   * Final CAC hook invoked after devframe's built-in subcommands and
   * after the definition's `cli.configure`. Use this to add app-level
   * flags and commands at the assembly stage.
   */
  configureCli?: (cli: CAC) => void
  /**
   * Called once the dev server is listening. Use this to print a
   * startup banner or trigger side-effects that depend on the live URL.
   */
  onReady?: (info: { origin: string, port: number, app: App }) => void | Promise<void>
}

export interface CliHandle {
  /**
   * Raw CAC instance. Mutate before calling `parse()` for last-mile
   * flag or command additions that don't fit `configureCli`.
   */
  cli: CAC
  parse: (argv?: string[]) => Promise<void>
}

export function createCli(d: DevtoolDefinition, options: CreateCliOptions = {}): CliHandle {
  const defaultPort = options.defaultPort ?? d.cli?.port ?? 9999
  const defaultHost = d.cli?.host ?? 'localhost'
  const command = d.cli?.command ?? d.id

  const cli = cac(command)

  cli
    .command('[...args]', 'Start a local dev server')
    .option('--port <port>', 'Port to listen on')
    .option('--host <host>', 'Host to bind to', { default: defaultHost })
    .option('--open', 'Open the browser on start')
    .option('--no-open', 'Do not open the browser')
    .action(async (_args: unknown, flags: CliFlags) => {
      const host = flags.host ?? defaultHost
      const port = flags.port ?? await getPort({
        port: defaultPort,
        portRange: d.cli?.portRange,
        random: d.cli?.random,
        host,
      })
      await runDevServer(d, { host, port, flags }, options)
    })

  cli
    .command('build', 'Build a static snapshot')
    .option('--out-dir <outDir>', 'Output directory', { default: 'dist-static' })
    .option('--base <base>', 'URL base', { default: '/' })
    .action(async (flags: { outDir: string, base?: string }) => {
      await createBuild(d, { outDir: flags.outDir, base: flags.base })
    })

  cli
    .command('spa', 'Build a deployable SPA bundle')
    .option('--out-dir <outDir>', 'Output directory', { default: 'dist-spa' })
    .option('--base <base>', 'URL base', { default: '/' })
    .action(async (flags: { outDir: string, base?: string }) => {
      await createSpa(d, { outDir: flags.outDir, base: flags.base })
    })

  cli
    .command('mcp', 'Start an MCP server exposing agent-facing tools (stdio) [experimental]')
    .action(async () => {
      // MCP clients expect JSON-RPC on stdout — route welcome/logging
      // noise out of the way. Logs-SDK diagnostics land on stderr by
      // default, so nothing extra needed beyond not printing here.
      const { createMcpServer } = await import('./mcp')
      await createMcpServer(d, {
        transport: 'stdio',
        // Deliberately go to stderr: stdout is the MCP transport.
        onReady: ({ transport }) => {
          console.error(`[devframe] "${d.id}" MCP server ready (${transport})`)
        },
      })
    })

  // Definition-level capability hook first, then assembly-level hook.
  d.cli?.configure?.(cli)
  options.configureCli?.(cli)

  cli.help()
  cli.version('0.0.0')

  return {
    cli,
    async parse(argv = process.argv) {
      cli.parse(argv, { run: false })
      await cli.runMatchedCommand()
    },
  }
}

interface CliFlags {
  host?: string
  port?: number
  open?: boolean
  [key: string]: unknown
}

interface DevServerOptions {
  host: string
  port: number
  flags: CliFlags
}

async function runDevServer(d: DevtoolDefinition, serverOptions: DevServerOptions, cliOptions: CreateCliOptions): Promise<void> {
  const distDir = d.cli?.distDir
  if (!distDir)
    throw new Error(`[devframe] dev: no cli.distDir for "${d.id}". Set \`cli.distDir\` on the definition.`)

  const app = createApp()
  const origin = `http://${serverOptions.host}:${serverOptions.port}`
  const basePath = resolveBasePath(d, 'standalone')

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
  const setupInfo: DevtoolSetupInfo = { flags: serverOptions.flags }
  await d.setup(ctx, setupInfo)

  app.use(basePath, sirv(resolve(distDir), { dev: true, single: true }) as any)

  await startHttpAndWs({
    context: ctx,
    host: serverOptions.host,
    port: serverOptions.port,
    app,
    auth: d.cli?.auth,
    onReady: async (info) => {
      await cliOptions.onReady?.(info)
      await maybeOpenBrowser(d, serverOptions.flags, `${info.origin}${basePath}`)
    },
  })
}

async function maybeOpenBrowser(d: DevtoolDefinition, flags: CliFlags, origin: string): Promise<void> {
  const cliOpen = d.cli?.open
  // `--no-open` sets flags.open to `false`; `--open` to `true`; unset is undefined.
  const shouldOpen = flags.open ?? (cliOpen !== undefined && cliOpen !== false)
  if (!shouldOpen)
    return
  const target = typeof flags.open === 'string'
    ? resolveOpenTarget(origin, flags.open)
    : typeof cliOpen === 'string'
      ? resolveOpenTarget(origin, cliOpen)
      : origin
  try {
    const { default: open } = await import('open')
    await open(target)
  }
  catch {
    // `open` is optional; failing to launch a browser shouldn't break
    // the dev server. The user can navigate manually.
  }
}

function resolveOpenTarget(origin: string, target: string): string {
  if (/^https?:/.test(target))
    return target
  if (target.startsWith('/'))
    return origin.replace(/\/$/, '') + target
  return origin.replace(/\/$/, '') + (target ? `/${target}` : '')
}
