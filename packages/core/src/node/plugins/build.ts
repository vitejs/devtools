/* eslint-disable no-console */

import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import type { Plugin, ResolvedConfig } from 'vite'
import type { ResolvedDevToolsConfig } from '../config'
import type { ViteDevToolsUiOptions } from '../ui'
import { colors as c } from 'devframe/utils/colors'
import { resolve } from 'pathe'
import { MARK_NODE } from '../constants'

export interface DevToolsBuildOptions {
  resolvedConfig?: ResolvedDevToolsConfig
  outDir?: string
  /** Reference-UI options forwarded to the static snapshot's `createUi`. */
  ui?: ViteDevToolsUiOptions
}

export function DevToolsBuild(options: DevToolsBuildOptions = {}): Plugin {
  let context: ViteDevToolsNodeContext
  let resolvedConfig: ResolvedConfig

  return {
    name: 'vite:devtools:build',
    apply: 'build',

    configResolved(config) {
      resolvedConfig = config
    },

    async buildStart() {
      const { createDevToolsContext } = await import('../context')
      context = await createDevToolsContext(
        resolvedConfig,
        undefined,
        options.resolvedConfig,
      )
    },

    async closeBundle() {
      console.log(c.cyan`${MARK_NODE} Building static Vite DevTools...`)

      const outDir = options.outDir
        ? resolve(resolvedConfig.root, options.outDir)
        : resolve(resolvedConfig.root, resolvedConfig.build.outDir)

      const { buildStaticDevTools } = await import('../build-static')
      await buildStaticDevTools({ context, outDir, withApp: true, ui: options.ui })
    },
  }
}
