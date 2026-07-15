import { createCli } from 'devframe/adapters/cli'
import c from 'ansis'
import { log } from '@clack/prompts'
import { oxcDevframe, OXC_DEVTOOLS_BASE } from '../node/devframe'
import { runLint } from './lint'

/**
 * Build the standalone Oxc DevTools CLI. Wraps the portable {@link oxcDevframe}
 * definition with devframe's `dev` / `build` / `spa` / `mcp` command shell and
 * layers on the oxc-specific `lint` command that generates the session logs the
 * UI reads.
 */
export function createOxcCli() {
  return createCli(oxcDevframe, {
    onReady: ({ origin }) => {
      log.info(`Oxc Inspector UI is running on ${c.cyan(`${origin}${OXC_DEVTOOLS_BASE}`)}`)
    },
    configureCli(cli) {
      cli
        .command('lint [...args]', 'Run oxlint and generate a session for the UI')
        .allowUnknownOptions()
        .action(async (args: string[] = []) => {
          await runLint(args)
        })
    },
  })
}
