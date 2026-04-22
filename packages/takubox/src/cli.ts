import type { DevtoolDefinition } from './types/devtool'
import process from 'node:process'

export interface CreateCliOptions {
  /** Override the default command name (defaults to the devtool id). */
  command?: string
  /** Default port for the dev server (default: 9999). */
  defaultPort?: number
}

export interface CliHandle {
  /** Parse argv and run the matched subcommand. */
  parse: (argv?: string[]) => Promise<void>
}

/**
 * Create a standalone CLI for a devtool. Wires cac + h3 + ws + sirv
 * with `dev` (default), `build`, and `spa` subcommands.
 *
 * Implementation is intentionally minimal in this commit — the full h3
 * server composition lands as the CLI hooks into `createHostContext` +
 * `createH3DevToolsHost`.
 */
export function createCli(d: DevtoolDefinition, _options: CreateCliOptions = {}): CliHandle {
  return {
    async parse(argv = process.argv.slice(2)) {
      // Placeholder — the full adapter wires cac subcommands onto
      // buildStatic / buildSpa / h3 dev server. Keep the shape stable
      // so authors' `bin.mjs` files already work.

      console.warn(`[takubox] createCli stub for "${d.id}" — not yet fully wired. argv:`, argv)
    },
  }
}
