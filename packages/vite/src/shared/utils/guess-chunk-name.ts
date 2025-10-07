import type { Chunk as ChunkInfo } from '@rolldown/debug'

export function guessChunkName(chunk: ChunkInfo) {
  if (chunk.name)
    return chunk.name
  if (chunk.modules.length === 1)
    return `[${simplifyModuleName(chunk.modules[0]!)}]`
  if (chunk.modules.length > 1)
    return `[${simplifyModuleName(`${chunk.modules[0]}`)}_${chunk.modules.length}]`
  return '[unnamed]'
}

export function simplifyModuleName(module: string) {
  let parts = module
    .replace(/^.*(\.pnpm|node_modules|src|app|packages)\//gi, '') // remove anything before node_modules or src
    .replace(/\b(index|main|dist|test|component|components)\b/gi, '') // boring names
    .replace(/\/+/g, '/') // duplicate slashes
    .replace(/\?.*$/, '') // query string
    .replace(/\.\w+$/, '') // extension
    .replace(/\W/g, '_') // non-alphanumeric characters
    .replace(/_+/g, '_') // duplicate underscores
    .replace(/^_+|_+$/g, '') // leading/trailing underscores
    .replace(/([a-z])([A-Z])/g, '$1_$2') // camel case to snake case
    .toLowerCase()
    .split('_')
    .filter(Boolean)

  parts = Array.from(new Set(parts))

  if (parts.length > 5)
    parts = parts.slice(0, 5)

  return parts.join('_')
}
