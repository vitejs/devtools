import type { SessionCompareModuleDiff } from '../types'

export function filterComparedModules(modules: SessionCompareModuleDiff[] | undefined, options: { chunk?: string, search: string }) {
  const search = options.search.trim().toLowerCase()
  return (modules ?? []).filter((item) => {
    if (options.chunk && !item.previousChunkKeys.includes(options.chunk) && !item.currentChunkKeys.includes(options.chunk))
      return false
    return !search || item.name.toLowerCase().includes(search) || !!item.package?.toLowerCase().includes(search)
  })
}

export function getComparedModuleCount(modules: SessionCompareModuleDiff[] | undefined, side: number) {
  return (modules ?? []).filter(item => (side === 0 ? item.previousId : item.currentId) != null).length
}
