import type { Choice } from 'prompts'
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import prompts from 'prompts'

/**
 * Workspace globs, mirrored from `pnpm-workspace.yaml`'s `packages:` list: a
 * new package, example, or other playground shows up here for free, with no
 * change to this script. `playgrounds/core` is listed explicitly rather than
 * as a `playgrounds/*` glob because `playgrounds/production` is a separate,
 * standalone pnpm workspace (see its own `pnpm-workspace.yaml`) that needs a
 * manual `setup` step before it's runnable, so it stays out of the picker.
 */
const WORKSPACE_PATTERNS = ['playgrounds/*', 'packages/*', 'examples/*', 'storybook']

/**
 * Script names that make a workspace package runnable as a "play" — the
 * first one present in a package's `scripts` wins. `play:dev`/`play` cover
 * the examples/core convention, `dev` covers the Nuxt UI packages, `docs`
 * and `start` round out the rest.
 */
const RUN_SCRIPTS = ['play:dev', 'play', 'dev', 'storybook']

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

interface Play {
  dir: string
  pkgName: string
  script: string
}

function expandPattern(pattern: string): string[] {
  if (!pattern.endsWith('/*'))
    return [pattern]
  const base = pattern.slice(0, -2)
  const baseDir = join(rootDir, base)
  if (!existsSync(baseDir))
    return []
  return readdirSync(baseDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => `${base}/${entry.name}`)
    .sort((a, b) => a.localeCompare(b))
}

function findPlay(dir: string): Play | undefined {
  const pkgPath = join(rootDir, dir, 'package.json')
  if (!existsSync(pkgPath))
    return undefined
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  const script = RUN_SCRIPTS.find(name => pkg.scripts?.[name])
  if (!script)
    return undefined
  return { dir, pkgName: pkg.name, script }
}

function suggest(input: string, choices: Choice[]): Promise<Choice[]> {
  const needle = input.toLowerCase()
  return Promise.resolve(choices.filter(choice => choice.title.toLowerCase().includes(needle)))
}

async function main(): Promise<void> {
  const plays = WORKSPACE_PATTERNS
    .flatMap(expandPattern)
    .map(findPlay)
    .filter((play): play is Play => play !== undefined)

  if (plays.length === 0) {
    console.error(`No playgrounds found — none of ${WORKSPACE_PATTERNS.join(', ')} has a package.json with a ${RUN_SCRIPTS.join('/')} script.`)
    process.exitCode = 1
    return
  }

  const { play } = await prompts({
    type: 'autocomplete',
    name: 'play',
    message: 'Select a playground to run',
    choices: plays.map(p => ({
      title: p.dir,
      description: `${p.pkgName} · pnpm run ${p.script}`,
      value: p,
    })),
    suggest,
  }) as { play?: Play }

  if (!play) {
    console.log('No playground selected.')
    return
  }

  console.log('\n▶ pnpm run build\n')

  const build = spawnSync('pnpm', ['run', 'build'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false,
  })

  if (build.status !== 0) {
    process.exitCode = build.status ?? 1
    return
  }

  console.log(`\n▶ pnpm run ${play.script}  (${play.dir})\n`)
  const result = spawnSync('pnpm', ['run', play.script], {
    cwd: join(rootDir, play.dir),
    stdio: 'inherit',
    shell: false,
  })

  process.exitCode = result.status ?? 1
}

main()
