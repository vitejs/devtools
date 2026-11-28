import type { Node, ParseError } from 'jsonc-parser'
import type { GraphTask, TaskSource } from '../shared/types'
import { constants } from 'node:fs'
import { access, lstat, readdir, readFile, realpath, stat } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { parseTree } from 'jsonc-parser'

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
    const [root, directory] = await Promise.all([realpath(workspaceRoot), realpath(packageDir)])
    if (!isWithin(root, directory))
      return
    const file = join(directory, 'package.json')
    const entry = await lstat(file).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT')
        throw error
    })
    // Vite+ treats a workspace root without a manifest as having no scripts.
    if (!entry)
      return directory === root ? { path: file, content: '', scripts: new Map() } : undefined
    const path = entry.isSymbolicLink() ? await realpath(file) : file
    if (!isWithin(root, path))
      return
    const content = (await readFile(path, 'utf8')).replace(/^\uFEFF/, '')
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

const configFilename = /^vite\.config\.[cm]?[jt]s$/

async function findPackageConfig(workspaceRoot: string, packageDir: string): Promise<string | undefined> {
  try {
    const [root, directory] = await Promise.all([realpath(workspaceRoot), realpath(packageDir)])
    if (!isWithin(root, directory))
      return
    const entries = await readdir(directory, { withFileTypes: true })
    let candidate: string | undefined
    for (const entry of entries) {
      if (!configFilename.test(entry.name))
        continue
      const path = join(directory, entry.name)
      if (!entry.isFile() && !(entry.isSymbolicLink() && (await stat(path).catch(() => undefined))?.isFile()))
        continue
      if (candidate)
        return
      candidate = path
    }
    if (!candidate)
      return
    const path = await realpath(candidate)
    if (!isWithin(root, path) || !(await stat(path)).isFile())
      return
    await access(path, constants.R_OK)
    return resolve(workspaceRoot, relative(root, path))
  }
  catch {
    // A package or its configuration can disappear after the graph loads.
    return undefined
  }
}

export async function findTaskSource(
  workspaceRoot: string,
  packageDir: string,
  task: GraphTask,
  expected: 'script' | 'config',
): Promise<string | undefined> {
  const manifest = await readTaskManifest(workspaceRoot, packageDir)
  if (!manifest || sourceKind(task, manifest) !== expected)
    return
  if (expected === 'script') {
    const key = manifest.scripts.get(task.name)!.children![0]!
    const lines = manifest.content.slice(0, key.offset).split(/\r\n|\r|\n/)
    return `${manifest.path}:${lines.length}:${lines.at(-1)!.length + 1}`
  }

  return findPackageConfig(workspaceRoot, packageDir)
}
