export function isNodeModulePath(path: string) {
  return !!path.match(/[/\\]node_modules[/\\]/) || isPackageName(path)
}

export function isPackageName(name: string) {
  return name[0] === '#' || !!name.match(/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/)
}

export function getModuleNameFromPath(path: string) {
  if (isPackageName(path))
    return path
  const match = path.replace(/\\/g, '/').match(/.*\/node_modules\/(.*)$/)?.[1]
  if (!match)
    return undefined
  if (match.startsWith('@'))
    return match.split('/').slice(0, 2).join('/')
  return match.split('/')[0]
}

export function getPnpmPackageInfoFromPath(path: string) {
  const normalizedPath = path
    .replace(/%2F/g, '/')
    .replace(/\\/g, '/')

  const packageSegment = normalizedPath.match(/\/node_modules\/\.pnpm\/([^/]+)/)?.[1]
  if (!packageSegment)
    return undefined

  const versionIndex = packageSegment.startsWith('@')
    ? packageSegment.indexOf('@', 1)
    : packageSegment.indexOf('@')
  if (versionIndex <= 0)
    return undefined

  const name = packageSegment
    .slice(0, versionIndex)
    .replace(/\+/g, '/')
  const version = packageSegment
    .slice(versionIndex + 1)
    .split('_')[0]

  if (!name || !version)
    return undefined

  return {
    name,
    version,
  }
}

export function getPackageDirPath(path: string) {
  const normalizedPath = path
    .replace(/%2F/g, '/')
    .replace(/\\/g, '/')

  if (isPackageName(normalizedPath))
    return normalizedPath

  const pnpmNestedNodeModules = normalizedPath.match(/^(.+\/node_modules\/\.pnpm\/[^/]+\/node_modules\/)/)?.[1]
  if (pnpmNestedNodeModules) {
    const packageName = getModuleNameFromPath(normalizedPath)
    if (packageName)
      return `${pnpmNestedNodeModules}${packageName}`
  }

  const pnpmPackagePath = normalizedPath.match(/^(.+\/node_modules\/\.pnpm\/[^/]+)(?:\/|$)/)?.[1]
  if (pnpmPackagePath)
    return pnpmPackagePath

  const nodeModulesPrefix = normalizedPath.match(/^(.+\/node_modules\/)/)?.[1]
  const packageName = getModuleNameFromPath(normalizedPath)
  if (!nodeModulesPrefix || !packageName)
    return normalizedPath

  return nodeModulesPrefix + packageName
}
