const NODE_MODULES = 'node_modules'

export function normalizeModulePath(path: string) {
  return path
    .replace(/%2F/gi, '/')
    .replace(/\\/g, '/')
}

export function isNodeModulePath(path: string) {
  return !!path.match(/[/\\]node_modules[/\\]/) || isPackageName(path)
}

export function isPackageName(name: string) {
  return name[0] === '#' || !!name.match(/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/)
}

export function getModuleNameFromPath(path: string) {
  const normalizedPath = normalizeModulePath(path)
  if (isPackageName(normalizedPath))
    return normalizedPath

  const segments = normalizedPath.split('/')
  const packageRoot = findNodeModulesPackage(segments)

  return packageRoot?.name ?? findPackageLocator(segments)?.name
}

export function getPnpmPackageInfoFromPath(path: string) {
  const segments = normalizeModulePath(path).split('/')
  const packageLocator = findPackageLocator(segments)
  if (packageLocator)
    return { name: packageLocator.name, version: packageLocator.version }

  return undefined
}

export function getPackageDirPath(path: string) {
  const normalizedPath = normalizeModulePath(path)

  if (isPackageName(normalizedPath))
    return normalizedPath

  const segments = normalizedPath.split('/')
  const packageRoot = findNodeModulesPackage(segments)

  if (packageRoot)
    return segments.slice(0, packageRoot.endIndex).join('/')

  const packageLocator = findPackageLocator(segments)
  if (packageLocator)
    return segments.slice(0, packageLocator.index + 1).join('/')

  return normalizedPath
}

function findNodeModulesPackage(segments: string[]) {
  for (const nodeModulesIndex of getNodeModulesIndexes(segments)) {
    const name = getPackageNameFromSegments(segments, nodeModulesIndex + 1)
    if (!name)
      continue

    return {
      name,
      endIndex: nodeModulesIndex + 1 + (name.startsWith('@') ? 2 : 1),
    }
  }
}

function getPackageNameFromSegments(segments: string[], startIndex: number) {
  const firstSegment = segments[startIndex]
  if (!firstSegment)
    return undefined

  const packageName = firstSegment.startsWith('@')
    ? `${firstSegment}/${segments[startIndex + 1] ?? ''}`
    : firstSegment

  return isPackageName(packageName) ? packageName : undefined
}

function findPackageLocator(segments: string[]) {
  for (const nodeModulesIndex of getNodeModulesIndexes(segments)) {
    if (getPackageNameFromSegments(segments, nodeModulesIndex + 1))
      continue

    const startIndex = nodeModulesIndex + 1
    const nextNodeModulesIndex = segments.indexOf(NODE_MODULES, startIndex)
    const boundaryIndex = nextNodeModulesIndex >= 0 ? nextNodeModulesIndex : segments.length

    for (const candidateIndex of [startIndex, startIndex + 1]) {
      if (candidateIndex >= boundaryIndex)
        continue

      const segment = segments[candidateIndex]
      if (!segment)
        continue

      const packageLocator = parsePackageLocatorSegment(segment)
      if (packageLocator)
        return { ...packageLocator, index: candidateIndex }
    }
  }

  return undefined
}

function getNodeModulesIndexes(segments: string[]) {
  return segments
    .map((segment, index) => segment === NODE_MODULES ? index : -1)
    .filter(index => index >= 0)
    .reverse()
}

function parsePackageLocatorSegment(segment: string): { name: string, version: string } | undefined {
  const versionIndex = segment.startsWith('@')
    ? segment.indexOf('@', 1)
    : segment.indexOf('@')

  if (versionIndex <= 0)
    return undefined

  const name = segment
    .slice(0, versionIndex)
    .replace(/\+/g, '/')
  const version = segment
    .slice(versionIndex + 1)
    .split('_')[0]

  if (!isPackageName(name) || !version)
    return undefined

  return {
    name,
    version,
  }
}
