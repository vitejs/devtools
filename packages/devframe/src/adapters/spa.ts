/* eslint-disable no-console */
import type { DevtoolDefinition } from '../types/devtool'
import fs from 'node:fs/promises'
import c from 'ansis'
import { resolve } from 'pathe'
import { buildStatic } from './build'

export interface BuildSpaOptions {
  outDir: string
  /** Absolute URL base the deployed SPA is served from (default: `/`). */
  base?: string
}

/**
 * Build a deployable SPA bundle for a devtool. Starts from the
 * `buildStatic` snapshot (which bakes the server-side `setup`-collected
 * RPC dumps), then writes a `spa-loader.json` descriptor so the
 * deployed SPA knows whether to read its data from the URL, an upload,
 * or the baked dump.
 *
 * Bundling of `setupBrowser` into the client is not yet handled here;
 * until then, deployed SPAs with `setupBrowser` should ship their own
 * in-page handler registration. That gap is explicit in the log
 * output.
 */
export async function buildSpa(d: DevtoolDefinition, options: BuildSpaOptions): Promise<void> {
  await buildStatic(d, options)

  const outDir = resolve(options.outDir)
  const spaLoader = {
    version: 1,
    mode: d.spa?.loader ?? 'none',
    base: options.base ?? '/',
  }
  await fs.writeFile(
    resolve(outDir, '.devtools', 'spa-loader.json'),
    JSON.stringify(spaLoader, null, 2),
    'utf-8',
  )

  if (d.setupBrowser) {
    console.log(c.yellow`[devframe] buildSpa: "${d.id}" declares setupBrowser but in-browser bundling is not yet implemented. Ship a separate client entry that registers the handlers.`)
  }

  console.log(c.green`[devframe] spa built for "${d.id}" (loader: ${spaLoader.mode}) -> ${outDir}`)
}
