/* eslint-disable no-console */

import type { DevToolsNodeContext } from '@vitejs/devtools-kit'
import type { Plugin, ResolvedConfig } from 'vite'
import c from 'ansis'
import { resolve } from 'pathe'
import { MARK_NODE } from '../constants'

export interface DevToolsBuildOptions {
  outDir?: string
}

export function DevToolsBuild(options: DevToolsBuildOptions = {}): Plugin {
  let context: DevToolsNodeContext
  let resolvedConfig: ResolvedConfig

  return {
    name: 'vite:devtools:build',
    apply: 'build',

    configResolved(config) {
      resolvedConfig = config
    },

    async buildStart() {
      const { createDevToolsContext } = await import('../context')
      context = await createDevToolsContext(resolvedConfig)
    },

    async closeBundle() {
      console.log(c.cyan`${MARK_NODE} Building static Vite DevTools...`)

      const outDir = options.outDir
        ? resolve(resolvedConfig.root, options.outDir)
        : resolve(resolvedConfig.root, resolvedConfig.build.outDir)

      const { buildStaticDevTools } = await import('../build-static')
      await buildStaticDevTools({ context, outDir })
    },
  }
}
