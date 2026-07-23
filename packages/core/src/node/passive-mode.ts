import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'pathe'
import { diagnostics } from './diagnostics'

/**
 * Passive mode keeps the injected DevTools overlay hidden until a developer
 * opts in with the activation shortcut. The opt-in is persisted per project as
 * a marker file inside the project's `node_modules`, so every subsequent dev
 * session on this machine boots straight into "normal mode" (docks shown).
 *
 * The flag lives under `node_modules` rather than Vite's `cacheDir` so a
 * `vite --force` cache purge doesn't silently drop the developer back into
 * passive mode.
 */
const MODE_DIRNAME = '.vite-devtools'
const MODE_BASENAME = 'mode.json'

interface PersistedMode {
  /** `true` once the developer activated the docks on this machine. */
  enabled: boolean
  updatedAt: string
}

/**
 * Resolve the marker file path, anchoring it to the nearest `node_modules`
 * directory at or above `root`. Falls back to `<root>/node_modules` when none
 * exists yet (it is created on write).
 */
export function resolveModeFile(root: string): string {
  let dir = root
  while (true) {
    if (existsSync(join(dir, 'node_modules')))
      return join(dir, 'node_modules', MODE_DIRNAME, MODE_BASENAME)
    const parent = dirname(dir)
    if (parent === dir)
      break
    dir = parent
  }
  return join(root, 'node_modules', MODE_DIRNAME, MODE_BASENAME)
}

/** Whether "normal mode" has been activated for this project. */
export function isNormalModeEnabled(root: string): boolean {
  const file = resolveModeFile(root)
  if (!existsSync(file))
    return false
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf-8')) as PersistedMode
    return parsed.enabled === true
  }
  catch {
    return false
  }
}

/**
 * Persist the project's DevTools mode. Enabling writes the marker file;
 * disabling removes it, returning the project to passive mode on next load.
 */
export function setNormalMode(root: string, enabled: boolean): void {
  const file = resolveModeFile(root)
  try {
    if (!enabled) {
      rmSync(file, { force: true })
      return
    }
    mkdirSync(dirname(file), { recursive: true })
    const payload: PersistedMode = { enabled: true, updatedAt: new Date().toISOString() }
    writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8')
  }
  catch (error) {
    diagnostics.DTK0033({ file, cause: error })
  }
}

/**
 * Resolve whether the injected overlay should start hidden. Passive mode is the
 * default; a project can opt out entirely (`passive: false`), and an activated
 * "normal mode" flag always wins.
 */
export function isPassive(root: string, passiveOption: boolean): boolean {
  if (!passiveOption)
    return false
  return !isNormalModeEnabled(root)
}
