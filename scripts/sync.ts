/**
 * Aligns the `devframe/` submodule with the `devframe` version pinned in
 * `pnpm-workspace.yaml`'s `catalogs.deps`. The catalog is the single source of
 * truth; the submodule is always checked out at the matching `vX.Y.Z` tag
 * (never a branch). Run via `pnpm sync` — also runs in `postinstall` so a
 * fresh clone initializes the submodule automatically.
 */
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { cac } from 'cac'
import { dirname, resolve } from 'pathe'
import { x } from 'tinyexec'

const REPO = 'devframes/devframe'
const SUBMODULE = 'devframe'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WORKSPACE_YAML = resolve(ROOT, 'pnpm-workspace.yaml')

const DEVFRAME_LINE_RE = /^(?<indent>\s*)devframe:\s*(?<prefix>[\^~]?)(?<version>[\w.-]+)\s*$/m

interface CatalogEntry { indent: string, prefix: string, version: string }

async function readCatalog(): Promise<CatalogEntry> {
  const yaml = await readFile(WORKSPACE_YAML, 'utf-8')
  const match = yaml.match(DEVFRAME_LINE_RE)
  if (!match?.groups)
    throw new Error('Could not find `devframe:` in pnpm-workspace.yaml catalogs.deps')
  const { indent, prefix, version } = match.groups
  return { indent, prefix, version }
}

async function writeCatalog(newVersion: string): Promise<boolean> {
  const cleaned = newVersion.replace(/^v/, '')
  const yaml = await readFile(WORKSPACE_YAML, 'utf-8')
  if (!DEVFRAME_LINE_RE.test(yaml))
    throw new Error('Could not find `devframe:` in pnpm-workspace.yaml catalogs.deps')
  const replaced = yaml.replace(DEVFRAME_LINE_RE, (_full, indent, prefix) =>
    `${indent}devframe: ${prefix || '^'}${cleaned}`)
  if (replaced === yaml)
    return false
  await writeFile(WORKSPACE_YAML, replaced, 'utf-8')
  return true
}

function versionToTag(version: string): string {
  const cleaned = version.replace(/^[\^~]/, '')
  return cleaned.startsWith('v') ? cleaned : `v${cleaned}`
}

async function git(args: string[], opts: { cwd?: string } = {}): Promise<string> {
  const result = await x('git', args, { nodeOptions: { cwd: opts.cwd ?? ROOT } })
  if (result.exitCode !== 0)
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`)
  return result.stdout.trim()
}

async function tryGit(args: string[], opts: { cwd?: string } = {}): Promise<string | null> {
  const result = await x('git', args, { nodeOptions: { cwd: opts.cwd ?? ROOT } })
  return result.exitCode === 0 ? result.stdout.trim() : null
}

async function ensureSubmoduleInit(): Promise<void> {
  if (existsSync(resolve(ROOT, SUBMODULE, '.git')))
    return
  console.log(`[sync] Initializing ${SUBMODULE} submodule…`)
  await git(['submodule', 'update', '--init', SUBMODULE])
}

async function resolveTagCommit(tag: string): Promise<string> {
  const local = await tryGit(['-C', SUBMODULE, 'rev-parse', `${tag}^{commit}`])
  if (local)
    return local
  console.log(`[sync] Tag ${tag} not local; fetching tags…`)
  await git(['-C', SUBMODULE, 'fetch', '--tags', '--quiet', 'origin'])
  const fetched = await tryGit(['-C', SUBMODULE, 'rev-parse', `${tag}^{commit}`])
  if (!fetched)
    throw new Error(`Tag ${tag} does not exist in ${REPO} — check the version or release the tag upstream first`)
  return fetched
}

async function verifyAtTag(expectedTag: string): Promise<void> {
  const actual = await tryGit(['-C', SUBMODULE, 'describe', '--exact-match', '--tags', 'HEAD'])
  if (!actual)
    throw new Error(`${SUBMODULE} HEAD is not at a tag — refusing to leave the submodule on an unpinned commit`)
  if (actual !== expectedTag)
    throw new Error(`${SUBMODULE} HEAD is at ${actual}, expected ${expectedTag}`)
}

async function fetchLatestTag(): Promise<string> {
  console.log(`[sync] Fetching latest release of ${REPO}…`)
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { accept: 'application/vnd.github+json' },
  })
  if (!res.ok)
    throw new Error(`GitHub API ${res.status}: ${await res.text()}`)
  const body = await res.json() as { tag_name?: string }
  if (!body.tag_name)
    throw new Error(`GitHub returned no tag_name for ${REPO}/releases/latest`)
  return body.tag_name
}

async function align(tag: string): Promise<void> {
  await ensureSubmoduleInit()
  const current = await git(['-C', SUBMODULE, 'rev-parse', 'HEAD'])
  const target = await resolveTagCommit(tag)
  if (current === target) {
    await verifyAtTag(tag)
    console.log(`[sync] ${SUBMODULE} already at ${tag} (${target.slice(0, 7)})`)
    return
  }
  console.log(`[sync] Checking out ${SUBMODULE} at ${tag} (${target.slice(0, 7)})`)
  await git(['-C', SUBMODULE, 'checkout', '--quiet', tag])
  await verifyAtTag(tag)
  await git(['add', SUBMODULE])
  console.log(`[sync] Submodule pointer staged. Commit when ready.`)
}

async function check(): Promise<void> {
  const { version } = await readCatalog()
  const tag = versionToTag(version)
  if (!existsSync(resolve(ROOT, SUBMODULE, '.git'))) {
    console.error(`[sync] FAIL: ${SUBMODULE} submodule is not initialized`)
    process.exit(1)
  }
  try {
    await verifyAtTag(tag)
  }
  catch (err) {
    console.error(`[sync] FAIL: ${(err as Error).message}`)
    process.exit(1)
  }
  console.log(`[sync] OK: ${SUBMODULE} at ${tag}`)
}

const cli = cac('pnpm sync')

cli
  .command('[version]', 'Align devframe submodule with catalog-pinned tag')
  .option('--latest', 'Bump catalog to latest GitHub release, then align')
  .option('--check', 'Read-only check (exit 1 if submodule HEAD ≠ catalog tag)')
  .action(async (versionArg: string | undefined, options: { latest?: boolean, check?: boolean }) => {
    if (options.check) {
      if (versionArg || options.latest)
        throw new Error('--check cannot be combined with a version argument or --latest')
      await check()
      return
    }

    let targetVersion: string | undefined = versionArg

    if (options.latest) {
      if (versionArg)
        throw new Error('Pass a version OR --latest, not both')
      targetVersion = await fetchLatestTag()
    }

    let catalogChanged = false
    if (targetVersion) {
      // Validate the tag exists upstream before mutating the catalog so a
      // typo or unreleased version doesn't leave the workspace in a broken state.
      await ensureSubmoduleInit()
      await resolveTagCommit(versionToTag(targetVersion))
      catalogChanged = await writeCatalog(targetVersion)
      const cleaned = targetVersion.replace(/^v/, '')
      console.log(catalogChanged
        ? `[sync] Catalog set to devframe ${cleaned}`
        : `[sync] Catalog already at devframe ${cleaned}`)
    }

    const { version } = await readCatalog()
    await align(versionToTag(version))

    if (catalogChanged)
      console.log('[sync] Run `pnpm install` to refresh the lockfile.')
  })

cli.help()
cli.parse(process.argv, { run: false })

Promise.resolve(cli.runMatchedCommand()).catch((err: Error) => {
  console.error(`[sync] ${err.message}`)
  process.exit(1)
})
