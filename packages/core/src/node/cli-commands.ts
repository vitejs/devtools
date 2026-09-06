/* eslint-disable no-console */

import { colors as c } from 'devframe/utils/colors'
import { resolve } from 'pathe'
import { MARK_NODE } from './constants'
import { diagnostics } from './diagnostics'

export interface StartOptions {
  root?: string
  config?: string
  host: string
  port?: string | number
  open?: boolean
}

export async function start(options: StartOptions) {
  const { startDevTools } = await import('./start')
  return startDevTools(options)
}

export interface BuildOptions {
  root: string
  config?: string
  outDir: string
  base: string
}

export async function build(options: BuildOptions) {
  console.log(c.cyan`${MARK_NODE} Building static Vite DevTools...`)

  const { startStandaloneDevTools } = await import('./standalone')
  const devtools = await startStandaloneDevTools({
    cwd: options.root,
    config: options.config,
  })

  const outDir = resolve(devtools.config.root, options.outDir)

  const { buildStaticDevTools } = await import('./build-static')
  await buildStaticDevTools({
    context: devtools.context,
    outDir,
    base: options.base,
  })

  diagnostics.DTK0010()
}
