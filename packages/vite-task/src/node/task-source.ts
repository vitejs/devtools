import type { Node, ParseError } from 'jsonc-parser'
import type { GraphTask, TaskSource } from '../shared/types'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { readFile, realpath } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import process from 'node:process'
import { parseTree } from 'jsonc-parser'
import { diagnostics } from './diagnostics'

function isWithin(root: string, path: string): boolean {
  const rel = relative(root, path)
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel)
}

interface Manifest {
  path: string
  content: string
  scripts: Map<string, Node | undefined>
}

export async function readTaskManifest(workspaceRoot: string, packageDir: string): Promise<Manifest | undefined> {
  try {
    const [root, directory, path] = await Promise.all([realpath(workspaceRoot), realpath(packageDir), realpath(join(packageDir, 'package.json'))])
    if (!isWithin(root, directory) || !isWithin(root, path))
      return
    const content = await readFile(path, 'utf8')
    const errors: ParseError[] = []
    const tree = parseTree(content, errors, { disallowComments: true })
    if (errors.length || tree?.type !== 'object')
      return
    const sections = tree.children?.filter(property => property.children?.[0]?.value === 'scripts') ?? []
    const section = sections[0]?.children?.[1]
    if (sections.length > 1 || (section && section.type !== 'object'))
      return
    const scripts = new Map<string, Node | undefined>()
    for (const property of section?.children ?? []) {
      const name: string = property.children![0]!.value
      scripts.set(name, scripts.has(name) ? undefined : property)
    }
    return { path: join(workspaceRoot, relative(root, directory), 'package.json'), content, scripts }
  }
  catch {
    return undefined
  }
}

export function sourceKind(task: GraphTask, manifest?: Manifest): TaskSource['kind'] {
  if (!manifest)
    return 'unknown'
  if (!manifest.scripts.has(task.name))
    return 'config'
  const command = manifest.scripts.get(task.name)?.children?.[1]
  return command?.type === 'string' && command.value === task.command ? 'script' : 'unknown'
}

// Run the project's own public Vite+ loader in the same metadata mode as vp run.
// Keep config side effects and the metadata flag out of the live dev server.
// The IPC reply stays separate from anything the user's config prints.
const loadConfigEntry = `
  import { loadConfigFromFile } from 'vite-plus'
  let reply
  try {
    const config = await loadConfigFromFile({ command: 'build', mode: 'development' }, undefined, process.argv[1], 'silent')
    reply = { path: config?.path }
  }
  catch (error) {
    reply = { error: String(error) }
  }
  process.send(reply, () => process.exit())
`

async function loadPackageConfig(workspaceRoot: string, packageDir: string) {
  const child = spawn(process.execPath, ['--input-type=module', '-e', loadConfigEntry, packageDir], {
    cwd: workspaceRoot,
    env: { ...process.env, VP_RESOLVING_CONFIG_METADATA: '1' },
    stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
  })
  let reply: { path?: string, error?: string } | undefined
  child.on('message', (message) => {
    reply = message as typeof reply
  })
  const [code, signal] = await once(child, 'close')
  if (!reply || reply.error)
    throw diagnostics.VTKDT0006({ reason: `Could not load the package configuration: ${reply?.error ?? signal ?? `exit ${code}`}` })
  return reply.path
}

export async function resolveTaskSource(
  workspaceRoot: string,
  packageDir: string,
  task: GraphTask,
  expected: 'script' | 'config',
): Promise<string> {
  const manifest = await readTaskManifest(workspaceRoot, packageDir)
  if (!manifest || sourceKind(task, manifest) !== expected)
    throw diagnostics.VTKDT0006({ reason: 'The task source has changed or is unavailable. Refresh the task list.' })
  if (expected === 'script') {
    const key = manifest.scripts.get(task.name)!.children![0]!
    const lines = manifest.content.slice(0, key.offset).split(/\r\n|\r|\n/)
    return `${manifest.path}:${lines.length}:${lines.at(-1)!.length + 1}`
  }

  try {
    const loaded = await loadPackageConfig(workspaceRoot, dirname(manifest.path))
    if (loaded) {
      const root = await realpath(workspaceRoot)
      const path = await realpath(loaded)
      if (isWithin(root, path))
        return resolve(workspaceRoot, relative(root, path))
    }
  }
  catch (cause) {
    if (cause instanceof Error && cause.name === 'VTKDT0006')
      throw cause
    throw diagnostics.VTKDT0006({ reason: `Could not load the package configuration: ${String(cause)}`, cause })
  }
  throw diagnostics.VTKDT0006({ reason: 'The package has no accessible Vite configuration file.' })
}
