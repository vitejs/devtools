// @ts-check
/**
 * Build the Vite DevTools packages and pack them into local tarballs that this
 * standalone playground installs — the same artifacts that would be published
 * to npm, so the playground exercises the real user install path.
 *
 * Usage:
 *   node scripts/pack-local.mjs            # build the monorepo, then pack
 *   node scripts/pack-local.mjs --no-build # skip the build, just (re)pack dist
 *
 * `pnpm pack` resolves each package's `workspace:*` and `catalog:*` protocols
 * into concrete versions, so the tarballs are exactly what end users receive.
 * The playground's package.json then points `@vitejs/devtools` and every
 * inter-package dependency at these tarballs via `pnpm.overrides`.
 */
import { execSync } from 'node:child_process'
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const playgroundDir = resolve(scriptDir, '..')
const repoRoot = resolve(playgroundDir, '../..')
const tarballDir = join(playgroundDir, '.tarballs')

/**
 * The set of packages published to npm as part of Vite DevTools.
 * `@vitejs/devtools-ui` is private (bundled into the others at build time) and
 * `@vitejs/devtools-oxc` is a separate opt-in package, so neither is packed.
 *
 * @type {Array<{ name: string, dir: string, out: string }>}
 */
const PACKAGES = [
  { name: '@vitejs/devtools', dir: 'packages/core', out: 'vitejs-devtools.tgz' },
  { name: '@vitejs/devtools-kit', dir: 'packages/kit', out: 'vitejs-devtools-kit.tgz' },
  { name: '@vitejs/devtools-rolldown', dir: 'packages/rolldown', out: 'vitejs-devtools-rolldown.tgz' },
  { name: '@vitejs/devtools-vite', dir: 'packages/vite', out: 'vitejs-devtools-vite.tgz' },
  { name: '@vitejs/devtools-vitest', dir: 'packages/vitest', out: 'vitejs-devtools-vitest.tgz' },
  { name: '@vitejs/devtools-oxc', dir: 'packages/oxc', out: 'vitejs-devtools-oxc.tgz' },
]

const skipBuild = process.argv.includes('--no-build')

/** @param {string} cmd @param {string} cwd */
function run(cmd, cwd) {
  console.log(`\n$ ${cmd}\n  (cwd: ${cwd})`)
  execSync(cmd, { cwd, stdio: 'inherit' })
}

if (!skipBuild) {
  run('pnpm build', repoRoot)
}

rmSync(tarballDir, { recursive: true, force: true })
mkdirSync(tarballDir, { recursive: true })

// Pack each package. `--ignore-scripts` skips the `prepack` rebuild since the
// monorepo build above already produced fresh dist output.
for (const { name, dir } of PACKAGES) {
  console.log(`\nPacking ${name}...`)
  run(`pnpm pack --config.ignore-scripts=true --pack-destination "${tarballDir}"`, join(repoRoot, dir))
}

// pnpm writes `<name>-<version>.tgz`; rename to the stable, version-agnostic
// names the playground's package.json / overrides reference.
const produced = readdirSync(tarballDir)
for (const { name, out } of PACKAGES) {
  const base = name.replace('@', '').replace('/', '-')
  const pattern = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d[^/]*\\.tgz$`)
  const match = produced.find(f => pattern.test(f))
  if (!match)
    throw new Error(`Could not find packed tarball for ${name} (expected ${base}-<version>.tgz)`)
  renameSync(join(tarballDir, match), join(tarballDir, out))
  console.log(`✓ ${name} -> .tarballs/${out}`)
}

console.log('\nDone. Now run: pnpm install --no-frozen-lockfile')
