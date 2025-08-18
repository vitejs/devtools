import type { ModuleDest, ModuleTreeNode } from '~~/shared/types'

export function bytesToHumanSize(bytes: number, digits = 2) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  if (i === 0)
    return [bytes, 'B']
  return [(+(bytes / 1024 ** i).toFixed(digits)).toLocaleString(), sizes[i]]
}

export function getContentByteSize(content: string) {
  if (!content)
    return 0
  return new TextEncoder().encode(content).length
}

export function toTree(modules: ModuleDest[], name: string) {
  const node: ModuleTreeNode = { name, children: {}, items: [] }

  function add(mod: ModuleDest, parts: string[], current = node) {
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

  function flat(node: ModuleTreeNode) {
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

export function formatDuration(ms: number | null | undefined, stringify?: boolean) {
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
