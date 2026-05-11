/* eslint-disable no-console */
import type { DevframeDefinition } from '../types/devframe'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import process from 'node:process'
import { dirname, resolve } from 'pathe'
import {
  DEVTOOLS_CONNECTION_META_FILENAME,
  DEVTOOLS_RPC_DUMP_DIRNAME,
  DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME,
} from '../constants'
import { createHostContext } from '../node/context'
import { createH3DevToolsHost } from '../node/host-h3'
import { collectStaticRpcDump } from '../node/static-dump'
import { strictJsonStringify } from '../rpc/serialization'
import { colors as c } from '../utils/colors'
import { structuredCloneStringify } from '../utils/structured-clone'
import { resolveBasePath } from './_shared'

export interface CreateBuildOptions {
  /** Output directory. Defaults to `dist-static`. */
  outDir?: string
  /** Absolute URL base the output is served from (default: `/`). */
  base?: string
  /**
   * Override the SPA dist directory to copy into `outDir`. When omitted
   * the adapter reads `devframe.cli?.distDir` — authors typically set this
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
 * Produce a self-contained static deploy of a devframe:
 *
 *   - Build a `mode: 'build'` context and run `devframe.setup(ctx)`.
 *   - Copy the author's SPA dist into `<outDir>/`.
 *   - Write `<outDir>/__connection.json` (`{ backend: 'static' }`) and the
 *     sharded RPC dump under `<outDir>/__rpc-dump/` so the deployed SPA
 *     discovers both via relative paths from `document.baseURI`.
 *   - When `def.spa` is configured, also write `<outDir>/spa-loader.json`
 *     describing the SPA's data-loader mode (`'query'` / `'upload'` /
 *     `'none'`). The output is mount-path agnostic — the same bundle
 *     works at `/`, `/devtools/`, or any base, no rewriting required.
 */
export async function createBuild(d: DevframeDefinition, options: CreateBuildOptions = {}): Promise<void> {
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
    host: createH3DevToolsHost({ origin: 'http://localhost', appName: d.id }),
  })
  await d.setup(ctx)

  await fs.mkdir(resolve(outDir, DEVTOOLS_RPC_DUMP_DIRNAME), { recursive: true })

  const jsonSerializableMethods: string[] = []
  for (const def of ctx.rpc.definitions.values()) {
    if (def.jsonSerializable === true)
      jsonSerializableMethods.push(def.name)
  }
  await fs.writeFile(
    resolve(outDir, DEVTOOLS_CONNECTION_META_FILENAME),
    JSON.stringify({ backend: 'static', jsonSerializableMethods }, null, 2),
    'utf-8',
  )

  console.log(c.cyan`[devframe] writing RPC dump to ${resolve(outDir, DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME)}`)
  const dump = await collectStaticRpcDump(ctx.rpc.definitions.values(), ctx)
  const indent = options.pretty ? 2 : undefined
  for (const [filepath, file] of Object.entries(dump.files)) {
    const fullpath = resolve(outDir, filepath)
    await fs.mkdir(dirname(fullpath), { recursive: true })
    const text = file.serialization === 'structured-clone'
      ? structuredCloneStringify(file.data)
      : strictJsonStringify(file.data, file.fnName)
    await fs.writeFile(
      fullpath,
      // structured-clone-es output is single-line; only JSON honors `indent`.
      file.serialization === 'json' && indent != null
        ? JSON.stringify(JSON.parse(text), null, indent)
        : text,
      'utf-8',
    )
  }
  await fs.writeFile(
    resolve(outDir, DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME),
    JSON.stringify(dump.manifest, null, 2),
    'utf-8',
  )

  if (d.spa) {
    const base = options.base ?? resolveBasePath(d, 'standalone')
    const spaLoader = {
      version: 1,
      mode: d.spa.loader ?? 'none',
      base,
    }
    await fs.writeFile(
      resolve(outDir, 'spa-loader.json'),
      JSON.stringify(spaLoader, null, 2),
      'utf-8',
    )
  }

  console.log(c.green`[devframe] built "${d.id}" -> ${outDir}`)
}
