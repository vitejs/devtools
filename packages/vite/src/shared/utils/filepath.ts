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

export function getPackageDirPath(path: string) {
  const normalizedPath = path
    .replace(/%2F/g, '/')
    .replace(/\\/g, '/')

  const nodeModulesPrefix = normalizedPath.match(/^(.+\/node_modules\/)/)?.[1]
  const packageName = getModuleNameFromPath(path)

  return nodeModulesPrefix! + packageName
}
