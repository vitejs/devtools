import type { ViteModuleDest, ViteModuleTreeNode } from '~/types/modules'

export function bytesToHumanSize(bytes: number, digits = 2) {
  const sizes = ['Bytes', 'kB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes || 1) / Math.log(1000))
  if (i === 0)
    return [bytes, 'B']
  return [(+(bytes / 1000 ** i).toFixed(digits)).toLocaleString(), sizes[i]]
}

export function toTree(modules: ViteModuleDest[], name: string) {
  const node: ViteModuleTreeNode = { name, children: {}, items: [] }

  function add(mod: ViteModuleDest, parts: string[], current = node) {
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

  function flat(node: ViteModuleTreeNode) {
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
