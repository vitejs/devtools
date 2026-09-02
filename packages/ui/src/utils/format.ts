export function formatDuration(ms: number | null | undefined): string[]
export function formatDuration(ms: number | null | undefined, stringify: true): string
export function formatDuration(ms: number | null | undefined, stringify: false): string[]
export function formatDuration(ms: number | null | undefined, stringify?: boolean): string | string[] {
  let duration = []

  if (ms == null)
    duration = ['', '-']
  else if (ms < 1)
    duration = ['<1', 'ms']
  else if (ms < 1000)
    duration = [ms.toFixed(0), 'ms']
  else if (ms < 1000 * 60)
    duration = [(ms / 1000).toFixed(1), 's']
  else
    duration = [(ms / 1000 / 60).toFixed(1), 'min']

  return stringify ? duration.join(' ') : duration
}

export function bytesToHumanSize(bytes: number, digits = 2) {
  const sizes = ['Bytes', 'kB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes || 1) / Math.log(1000))
  if (i === 0)
    return [bytes, 'B']
  return [(+(bytes / 1000 ** i).toFixed(digits)).toLocaleString(), sizes[i]]
}

export function getContentByteSize(content: string) {
  if (!content)
    return 0
  return new TextEncoder().encode(content).length
}

export interface ModuleDest {
  full: string
  path: string
}

export interface ModuleTreeNode<T extends { path: string } = ModuleDest> {
  name?: string
  children: Record<string, ModuleTreeNode<T>>
  items: T[]
}

export function toTree<T extends { path: string }>(modules: T[], name: string): ModuleTreeNode<T> {
  const node: ModuleTreeNode<T> = { name, children: {}, items: [] }

  function add(mod: T, parts: string[], current = node) {
    if (!mod)
      return

    if (parts.length <= 1) {
      current.items.push(mod)
      return
    }

    const first = parts.shift()!
    if (!current.children[first])
      current.children[first] = { name: first, children: {}, items: [] }
    add(mod, parts, current.children[first])
  }

  modules.forEach((m) => {
    const parts = m.path.split(/\//g).filter(Boolean)
    add(m, parts)
  })

  function flat(node: ModuleTreeNode<T>) {
    if (!node)
      return
    const children = Object.values(node.children)
    if (children.length === 1 && !node.items.length) {
      const child = children[0]!
      node.name = node.name ? `${node.name}/${child.name}` : child.name
      node.items = child.items
      node.children = child.children
      flat(node)
    }
    else {
      children.forEach(flat)
    }
  }

  Object.values(node.children).forEach(flat)

  return node
}

export function normalizeTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleString(undefined, {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  })
}
