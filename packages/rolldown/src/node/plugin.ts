import type { PluginWithDevTools } from '@vitejs/devtools-kit'
import process from 'node:process'
import { DEVTOOLS_VITEPLUS_GROUP_ID } from '@vitejs/devtools-kit/constants'
import { clientPublicDir } from '../dirs'
import { ROLLDOWN_DEVTOOLS_ENV } from './rolldown/build-runner'
import { rpcFunctions } from './rpc/index'

const ROLLDOWN_DEVTOOLS_BASE = '/__devtools-rolldown/'

export function DevToolsRolldownUI(): PluginWithDevTools {
  return {
    name: 'vite:devtools:rolldown-ui',
    // When the "Run build with devtools" button spawns a `vite build`, it sets
    // `VITE_DEVTOOLS_ROLLDOWN` on the child. This plugin is in the build's
    // plugin pipeline (mounted by core whenever this package is installed), so
    // it forces Rolldown's `devtools` output on for that build — no manual
    // `DevToolsIntegration` wiring needed. A normal `vite build` (without the
    // env var) is left untouched.
    configResolved(config) {
      if (process.env[ROLLDOWN_DEVTOOLS_ENV] !== 'true')
        return
      for (const environment of Object.values(config.environments))
        environment.build.rolldownOptions.devtools ??= {}
    },
    devtools: {
      setup(ctx) {
        for (const fn of rpcFunctions) {
          ctx.rpc.register(fn as any)
        }

        ctx.views.hostStatic(
          ROLLDOWN_DEVTOOLS_BASE,
          clientPublicDir,
        )

        ctx.docks.register({
          id: 'rolldown',
          title: 'Rolldown',
          groupId: DEVTOOLS_VITEPLUS_GROUP_ID,
          icon: `${ROLLDOWN_DEVTOOLS_BASE}favicon.svg`,
          type: 'iframe',
          url: ROLLDOWN_DEVTOOLS_BASE,
        })
      },
    },
  }
}
