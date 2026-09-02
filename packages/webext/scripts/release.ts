import { spawn } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import {
  cancel,
  confirm,
  intro,
  isCancel,
  note,
  outro,
  select,
  text,
} from '@clack/prompts'

type ReleaseType = 'major' | 'minor' | 'patch'
type VersionAction = ReleaseType | 'custom'

interface ExtensionManifest {
  version: string
  version_name?: string
  [key: string]: unknown
}

const MAX_VERSION_COMPONENT = 65_535
const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const workspaceDir = path.resolve(packageDir, '../..')
const manifestPath = path.join(packageDir, 'manifest.json')

function parseVersion(value: string, allowAllZero = false): number[] {
  const normalized = value.trim()
  if (!/^\d+(?:\.\d+){0,3}$/.test(normalized))
    throw new Error('Use 1 to 4 dot-separated integers, for example 0.1.0.')

  const components = normalized.split('.')
  if (components.some(component => component.length > 1 && component.startsWith('0')))
    throw new Error('Version components cannot contain leading zeroes.')

  const numbers = components.map(Number)
  if (numbers.some(component => component > MAX_VERSION_COMPONENT))
    throw new Error(`Version components cannot exceed ${MAX_VERSION_COMPONENT}.`)
  if (!allowAllZero && numbers.every(component => component === 0))
    throw new Error('The version cannot be all zeroes.')

  return numbers
}

function compareVersions(left: string, right: string): number {
  const leftComponents = parseVersion(left, true)
  const rightComponents = parseVersion(right, true)

  for (let index = 0; index < 4; index++) {
    const difference = (leftComponents[index] ?? 0) - (rightComponents[index] ?? 0)
    if (difference)
      return difference
  }
  return 0
}

function incrementVersion(version: string, releaseType: ReleaseType): string {
  const [major = 0, minor = 0, patch = 0] = parseVersion(version, true)

  if (releaseType === 'major')
    return `${major + 1}.0.0`
  if (releaseType === 'minor')
    return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

function promptValue<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel('Release cancelled.')
    process.exit(0)
  }
  return value as T
}

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: workspaceDir,
      stdio: 'inherit',
    })
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(signal
        ? `Release command was terminated by ${signal}.`
        : `Release command failed with exit code ${code ?? 'unknown'}.`))
    })
  })
}

if (!process.stdin.isTTY || !process.stdout.isTTY)
  throw new Error('The web extension release command requires an interactive terminal.')

const originalManifest = await readFile(manifestPath, 'utf8')
const manifest = JSON.parse(originalManifest) as ExtensionManifest
parseVersion(manifest.version, true)

const currentVersion = manifest.version
const suggestions = {
  patch: incrementVersion(currentVersion, 'patch'),
  minor: incrementVersion(currentVersion, 'minor'),
  major: incrementVersion(currentVersion, 'major'),
}

intro('Vite DevTools browser extension release')

const versionAction = promptValue(await select<VersionAction>({
  message: `Select a release version (current: ${currentVersion})`,
  options: [
    {
      value: 'patch',
      label: `Patch  ${suggestions.patch}`,
      hint: 'Bug fixes and small changes',
    },
    {
      value: 'minor',
      label: `Minor  ${suggestions.minor}`,
      hint: 'Backward-compatible features',
    },
    {
      value: 'major',
      label: `Major  ${suggestions.major}`,
      hint: 'Breaking changes',
    },
    {
      value: 'custom',
      label: 'Custom version',
      hint: 'Use a Chrome-compatible numeric version',
    },
  ],
}))

const version = versionAction === 'custom'
  ? promptValue(await text({
      message: 'Enter the release version',
      initialValue: suggestions.patch,
      placeholder: 'For example 0.1.0 or 0.1.0.1',
      validate(value) {
        const version = value?.trim() ?? ''
        try {
          parseVersion(version)
          if (compareVersions(version, currentVersion) <= 0)
            return `The version must be greater than ${currentVersion}.`
        }
        catch (error) {
          return error instanceof Error ? error.message : 'Invalid version.'
        }
      },
    })).trim()
  : suggestions[versionAction]

note(`${currentVersion} → ${version}`, 'Version')

const confirmed = promptValue(await confirm({
  message: 'Build and package this release?',
  initialValue: true,
}))
if (!confirmed) {
  cancel('Release cancelled.')
  process.exit(0)
}

const nextManifest: ExtensionManifest = {
  ...manifest,
  version,
  version_name: version,
}

let manifestUpdated = false
try {
  await writeFile(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`)
  manifestUpdated = true

  const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
  await runCommand(pnpmCommand, ['run', 'zip:webext'])
  outro(`Created Vite DevTools browser extension v${version}.`)
}
catch (error) {
  if (manifestUpdated)
    await writeFile(manifestPath, originalManifest)

  cancel(error instanceof Error ? error.message : 'Release failed.')
  process.exitCode = 1
}
