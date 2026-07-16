import type { Plugin } from 'vite'
import process from 'node:process'

/**
 * Environment variable the Rolldown DevTools "Run build" button sets on the
 * `vite build` child process it spawns.
 */
export const ROLLDOWN_DEVTOOLS_ENV = 'VITE_DEVTOOLS_ROLLDOWN'

/**
 * Turns Rolldown's `devtools` build output on when a build is spawned by the
 * Rolldown DevTools "Run build" button.
 *
 * The button spawns a `vite build` child process with `VITE_DEVTOOLS_ROLLDOWN`
 * set; this plugin then forces `rolldownOptions.devtools` for every environment
 * so the build emits the debug data the analyzer reads — without the user
 * wiring up `DevToolsIntegration` by hand. A normal `vite build` (without the
 * env var) is left untouched.
 */
export function DevToolsRolldownBuildFlag(): Plugin {
  return {
    name: 'vite:devtools:rolldown-build-flag',
    apply: 'build',
    configResolved: {
      order: 'post',
      handler(config) {
        if (process.env[ROLLDOWN_DEVTOOLS_ENV] !== 'true')
          return
        for (const environment of Object.values(config.environments))
          environment.build.rolldownOptions.devtools ??= {}
      },
    },
  }
}
