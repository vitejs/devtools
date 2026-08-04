// @ts-check
/**
 * Shared implementation behind every standalone playground's
 * `scripts/pack-local.mjs` (currently `playgrounds/production` and
 * `playgrounds/production-nuxt`).
 *
 * Builds the monorepo and packs the published Vite DevTools packages into
 * local tarballs, the same artifacts that would be published to npm, so a
 * standalone playground can install them and exercise the real user install
 * path. `pnpm pack` resolves each package's `workspace:*` and `catalog:*`
 * protocols into concrete versions, so the tarballs are exactly what end
 * users receive.
 *
 * Each call wipes and fully repacks the target tarball directory — there is
 * no incremental/stale state to reason about, and the produced filenames are
 * stable (version-agnostic) so a playground's `package.json` /
 * `pnpm-workspace.yaml` overrides never need to change between packs.
 */
import { execSync } from 'node:child_process'
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The set of packages published to npm as part of Vite DevTools.
 * `@vitejs/devtools-ui` is private (bundled into the others at build time) and
 * is not packed here.
 *
 * @type {Array<{ name: string, dir: string, out: string }>}
 */
export const DEVTOOLS_PACKAGES = [
  { name: '@vitejs/devtools', dir: 'packages/core', out: 'vitejs-devtools.tgz' },
  { name: '@vitejs/devtools-kit', dir: 'packages/kit', out: 'vitejs-devtools-kit.tgz' },
  { name: '@vitejs/devtools-rolldown', dir: 'packages/rolldown', out: 'vitejs-devtools-rolldown.tgz' },
  { name: '@vitejs/devtools-vite', dir: 'packages/vite', out: 'vitejs-devtools-vite.tgz' },
  { name: '@vitejs/devtools-vitest', dir: 'packages/vitest', out: 'vitejs-devtools-vitest.tgz' },
  { name: '@vitejs/devtools-oxc', dir: 'packages/oxc', out: 'vitejs-devtools-oxc.tgz' },
]

/** @param {string} cmd @param {string} cwd */
export function run(cmd, cwd) {
  console.log(`\n$ ${cmd}\n  (cwd: ${cwd})`)
  execSync(cmd, { cwd, stdio: 'inherit' })
}

/**
 * Build the monorepo (unless `skipBuild`) and pack every entry in
 * `DEVTOOLS_PACKAGES` into `tarballDir`, replacing whatever was there before.
 *
 * @param {{ repoRoot: string, tarballDir: string, skipBuild?: boolean }} options
 */
export function packDevToolsTarballs({ repoRoot, tarballDir, skipBuild = false }) {
  if (!skipBuild)
    run('pnpm build', repoRoot)

  // Always start from a clean directory: a full wipe-then-repack means there
  // is never a stale tarball left behind from a package that used to exist,
  // an interrupted previous run, or a version-suffixed leftover.
  rmSync(tarballDir, { recursive: true, force: true })
  mkdirSync(tarballDir, { recursive: true })

  // Pack each package. `--ignore-scripts` skips the `prepack` rebuild since
  // the monorepo build above already produced fresh dist output.
  for (const { name, dir } of DEVTOOLS_PACKAGES) {
    console.log(`\nPacking ${name}...`)
    run(`pnpm pack --config.ignore-scripts=true --pack-destination "${tarballDir}"`, join(repoRoot, dir))
  }

  // pnpm writes `<name>-<version>.tgz`; rename to the stable, version-agnostic
  // names the playground's package.json / overrides reference, so the latest
  // pack always lands under the exact same filename as the previous one.
  const produced = readdirSync(tarballDir)
  for (const { name, out } of DEVTOOLS_PACKAGES) {
    const base = name.replace('@', '').replace('/', '-')
    const pattern = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d[^/]*\\.tgz$`)
    const match = produced.find(f => pattern.test(f))
    if (!match)
      throw new Error(`Could not find packed tarball for ${name} (expected ${base}-<version>.tgz)`)
    renameSync(join(tarballDir, match), join(tarballDir, out))
    console.log(`✓ ${name} -> ${out}`)
  }
}
