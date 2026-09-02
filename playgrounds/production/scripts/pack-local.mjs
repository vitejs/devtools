// @ts-check
/**
 * Build the Vite DevTools packages, pack them into local tarballs, and
 * install this playground from them — the same artifacts that would be
 * published to npm, so the playground exercises the real user install path.
 *
 * Every run wipes `.tarballs/` and repacks from scratch, then reinstalls with
 * `--force` so pnpm never mistakes a freshly rebuilt tarball (same stable
 * filename, new content) for the previous stale install.
 *
 * Usage:
 *   node scripts/pack-local.mjs            # build the monorepo, pack, install
 *   node scripts/pack-local.mjs --no-build # skip the build, just (re)pack + install
 *
 * The playground's package.json / pnpm-workspace.yaml point `@vitejs/devtools`
 * and every inter-package dependency at these tarballs via `pnpm.overrides`.
 */
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { packDevToolsTarballs, run } from '../../../scripts/pack-devtools-tarballs.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const playgroundDir = resolve(scriptDir, '..')
const repoRoot = resolve(playgroundDir, '../..')
const tarballDir = join(playgroundDir, '.tarballs')

const skipBuild = process.argv.includes('--no-build')

packDevToolsTarballs({ repoRoot, tarballDir, skipBuild })

// `--force` bypasses pnpm's content-addressable store cache, guaranteeing the
// install always reflects the tarballs that were just packed above.
run('pnpm install --no-frozen-lockfile --force', playgroundDir)

console.log('\nDone. Run `pnpm dev` to start the playground.')
