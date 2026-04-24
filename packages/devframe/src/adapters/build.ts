/* eslint-disable no-console */
import type { DevtoolDefinition } from '../types/devtool'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import process from 'node:process'
import c from 'ansis'
import { dirname, join, resolve } from 'pathe'
import {
  DEVTOOLS_CONNECTION_META_FILENAME,
  DEVTOOLS_DIRNAME,
  DEVTOOLS_RPC_DUMP_DIRNAME,
  DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME,
} from '../constants'
import { createHostContext } from '../node/context'
import { createH3DevToolsHost } from '../node/host-h3'
import { collectStaticRpcDump } from '../node/static-dump'

export interface CreateBuildOptions {
  /** Output directory. Defaults to `dist-static`. */
  outDir?: string
  /** Absolute URL base the output is served from (default: `/`). */
  base?: string
  /**
   * Override the SPA dist directory to copy into `outDir`. When omitted
   * the adapter reads `devtool.cli?.distDir` — authors typically set this
   * once on the definition itself.
   */
  distDir?: string
  /**
   * Pretty-print RPC dump JSON files. Defaults to `false` so payload
   * shards (which can be multiple MB for graph-heavy tools) ship
   * minified. Set `true` when you need to diff / read the dumps by hand.
   */
  pretty?: boolean
}

/**
 * Produce a static snapshot of a devtool:
 *
 *   - Build a `runtime: 'build'` context and run `devtool.setup(ctx)`.
 *   - Collect RPC dumps for every `'static'` function.
 *   - Write a connection-meta descriptor + sharded dump files under
 *     `<outDir>/.devtools/`.
 *   - Copy the author's SPA dist into `<outDir>/`.
 */
export async function createBuild(d: DevtoolDefinition, options: CreateBuildOptions = {}): Promise<void> {
  const outDir = resolve(options.outDir ?? 'dist-static')
  const distDir = options.distDir ?? d.cli?.distDir
  if (!distDir)
    throw new Error(`[devframe] createBuild: no distDir for "${d.id}". Set \`cli.distDir\` on the definition or pass it as an option.`)

  if (existsSync(outDir))
    await fs.rm(outDir, { recursive: true })
  await fs.mkdir(outDir, { recursive: true })

  // Copy author's SPA into the output root.
  console.log(c.cyan`[devframe] copying SPA from ${distDir} -> ${outDir}`)
  await fs.cp(distDir, outDir, { recursive: true })

  const ctx = await createHostContext({
    cwd: process.cwd(),
    mode: 'build',
    host: createH3DevToolsHost({ origin: 'http://localhost' }),
  })
  await d.setup(ctx)

  const devToolsRoot = join(outDir, DEVTOOLS_DIRNAME)
  await fs.mkdir(resolve(devToolsRoot, DEVTOOLS_RPC_DUMP_DIRNAME), { recursive: true })
  await fs.writeFile(
    resolve(devToolsRoot, DEVTOOLS_CONNECTION_META_FILENAME),
    JSON.stringify({ backend: 'static' }, null, 2),
    'utf-8',
  )

  console.log(c.cyan`[devframe] writing RPC dump to ${resolve(devToolsRoot, DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME)}`)
  const dump = await collectStaticRpcDump(ctx.rpc.definitions.values(), ctx)
  const indent = options.pretty ? 2 : undefined
  for (const [filepath, data] of Object.entries(dump.files)) {
    const fullpath = resolve(devToolsRoot, filepath)
    await fs.mkdir(dirname(fullpath), { recursive: true })
    await fs.writeFile(fullpath, JSON.stringify(data, null, indent), 'utf-8')
  }
  await fs.writeFile(
    resolve(devToolsRoot, DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME),
    JSON.stringify(dump.manifest, null, 2),
    'utf-8',
  )

  console.log(c.green`[devframe] built "${d.id}" -> ${outDir}`)
}
