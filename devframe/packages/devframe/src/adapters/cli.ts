import type { CAC } from 'cac'
import type { App } from 'h3'
import type { DevframeDefinition } from '../types/devframe'
import process from 'node:process'
import cac from 'cac'
import { colors as c } from '../utils/colors'
import { createBuild } from './build'
import { createDevServer, resolveDevServerPort } from './dev'
import { flagKeyToOption, isBooleanFlag, parseCliFlags } from './flags'

export { defineCliFlags, parseCliFlags } from './flags'
export type { CliFlagsSchema, InferCliFlags } from './flags'

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

export function createCli(d: DevframeDefinition, options: CreateCliOptions = {}): CliHandle {
  const defaultPort = options.defaultPort ?? d.cli?.port ?? 9999
  const defaultHost = d.cli?.host ?? 'localhost'
  const command = d.cli?.command ?? d.id

  const cli = cac(command)

  const devCommand = cli
    .command('[...args]', 'Start a local dev server')
    .option('--port <port>', 'Port to listen on')
    .option('--host <host>', 'Host to bind to', { default: defaultHost })
    .option('--open', 'Open the browser on start')
    .option('--no-open', 'Do not open the browser')

  // Register typed flags from the definition ahead of `cli.configure`
  // so authors can still override or augment via the escape hatch.
  if (d.cli?.flags) {
    for (const [key, schema] of Object.entries(d.cli.flags)) {
      const optionName = flagKeyToOption(key)
      const description = (schema as any).description ?? ''
      if (isBooleanFlag(schema)) {
        devCommand.option(`--${optionName}`, description)
      }
      else {
        devCommand.option(`--${optionName} <value>`, description)
      }
    }
  }

  devCommand.action(async (_args: unknown, rawFlags: CliFlags) => {
    const flags = resolveTypedFlags(d, rawFlags) as CliFlags
    const host = (flags.host as string | undefined) ?? defaultHost
    const port = (flags.port as number | undefined) ?? await resolveDevServerPort(d, { host, defaultPort })
    await createDevServer(d, {
      host,
      port,
      flags,
      onReady: options.onReady,
    })
  })

  cli
    .command('build', 'Build a self-contained static deploy of the devframe')
    .option('--out-dir <outDir>', 'Output directory', { default: 'dist-static' })
    .option('--base <base>', 'URL base', { default: '/' })
    .option('--pretty', 'Pretty-print dump JSON (larger on disk)')
    .action(async (flags: { outDir: string, base?: string, pretty?: boolean }) => {
      await createBuild(d, { outDir: flags.outDir, base: flags.base, pretty: flags.pretty })
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

function resolveTypedFlags(d: DevframeDefinition, raw: Record<string, unknown>): Record<string, unknown> {
  if (!d.cli?.flags)
    return raw
  const { flags, issues } = parseCliFlags(d.cli.flags, raw)
  if (issues?.length) {
    for (const issue of issues)
      console.error(c.red`[devframe] invalid flag — ${issue}`)
    process.exit(1)
  }
  return flags
}
