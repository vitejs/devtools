import type { PackageInfo as RolldownPackageInfo } from '@rolldown/debug'
import type { PackageInfo, PackageMeta } from '../../../shared/types'
import type { RolldownEventsReader } from '../../rolldown/events-reader'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getPackageDirPath } from '../../../shared/utils/filepath'
import { getLogsManager } from '../utils'

type PackageFileInfo = PackageInfo['files'][number]
type PackageImporterInfo = PackageFileInfo['importers'][number]
type ResolvePackageDir = (path: string) => string | undefined

export function getPackagesManifest(
  reader: RolldownEventsReader,
) {
  return reader.manager.packageGraphReady
    ? getRolldownPackagesManifest(reader)
    : new Map<string, PackageInfo>()
}

function getNodeModulePackageDirPath(path: string) {
  return /[/\\]node_modules[/\\]/.test(path)
    ? getPackageDirPath(path)
    : undefined
}

function createPackageDirResolver(): ResolvePackageDir {
  const cache = new Map<string, string | undefined>()

  return (path) => {
    if (!cache.has(path))
      cache.set(path, getNodeModulePackageDirPath(path))
    return cache.get(path)
  }
}

function isPackageModulePath(path: string, packageDir: string, resolvePackageDir: ResolvePackageDir) {
  return resolvePackageDir(path) === packageDir
}

function getPackageKey(name: string, version: string) {
  return `${name}@${version}`
}

function getUniquePackageKey(packagesMap: Map<string, PackageInfo>, preferredKey: string) {
  if (!packagesMap.has(preferredKey))
    return preferredKey

  let index = 2
  let key = `${preferredKey}#${index}`
  while (packagesMap.has(key)) {
    index += 1
    key = `${preferredKey}#${index}`
  }
  return key
}

function getModuleTransformedCodeSize(reader: RolldownEventsReader, path: string) {
  const moduleBuildMetrics = reader.manager.modules.get(path)?.build_metrics
  return moduleBuildMetrics?.transforms[moduleBuildMetrics.transforms.length - 1]?.transformed_code_size ?? 0
}

function getPackageImportersMap(reader: RolldownEventsReader, resolvePackageDir: ResolvePackageDir) {
  const importersMap = new Map<string, Set<string>>()

  for (const [importer, module] of reader.manager.modules) {
    for (const item of module.imports ?? []) {
      const packageDir = resolvePackageDir(item.module_id)
      if (!packageDir || isPackageModulePath(importer, packageDir, resolvePackageDir))
        continue

      let importers = importersMap.get(packageDir)
      if (!importers) {
        importers = new Set()
        importersMap.set(packageDir, importers)
      }
      importers.add(importer)
    }
  }

  return importersMap
}

function getPackageImporters(
  reader: RolldownEventsReader,
  packageDir: string,
  packageModulePaths: Iterable<string>,
  packageImportersMap: Map<string, Set<string>>,
  resolvePackageDir: ResolvePackageDir,
): PackageImporterInfo[] {
  const modulesMap = reader.manager.modules
  const modulePaths = new Set(packageModulePaths)
  const importers = new Set(packageImportersMap.get(packageDir) ?? [])

  for (const path of modulePaths) {
    for (const importer of modulesMap.get(path)?.importers ?? []) {
      if (isPackageModulePath(importer, packageDir, resolvePackageDir))
        continue

      const importsPackageModule = modulesMap.get(importer)?.imports?.some((item) => {
        if (modulePaths.has(item.module_id))
          return true

        return resolvePackageDir(item.module_id) === packageDir
      })
      if (importsPackageModule)
        importers.add(importer)
    }
  }

  return Array.from(importers)
    .sort((a, b) => a.localeCompare(b))
    .map(path => ({ path, version: '' }))
}

function getRolldownPackagesManifest(reader: RolldownEventsReader) {
  const packagesMap = new Map<string, PackageInfo>()
  const resolvePackageDir = createPackageDirResolver()
  const packageImportersMap = getPackageImportersMap(reader, resolvePackageDir)

  for (const pkg of reader.manager.packages.values()) {
    const packageInfo = normalizeRolldownPackage(reader, pkg, packagesMap, packageImportersMap, resolvePackageDir)
    packagesMap.set(packageInfo.id, packageInfo)
  }

  return packagesMap
}

function normalizeRolldownPackage(
  reader: RolldownEventsReader,
  pkg: RolldownPackageInfo,
  packagesMap: Map<string, PackageInfo>,
  packageImportersMap: Map<string, Set<string>>,
  resolvePackageDir: ResolvePackageDir,
): PackageInfo {
  const name = pkg.name || pkg.package_root
  const version = pkg.version || '(unknown)'
  const id = getUniquePackageKey(packagesMap, pkg.package_id || getPackageKey(name, version))
  const modulePaths = Array.from(new Set(pkg.modules)).sort((a, b) => a.localeCompare(b))
  const importers = getPackageImporters(reader, pkg.package_root, modulePaths, packageImportersMap, resolvePackageDir)

  const files = modulePaths.map((path, index) => {
    let transformedCodeSize = getModuleTransformedCodeSize(reader, path)
    if (!transformedCodeSize && modulePaths.length === 1)
      transformedCodeSize = pkg.size

    return {
      path,
      transformedCodeSize,
      importers: index === 0 ? importers : [],
    }
  })

  return {
    id,
    name,
    version,
    dir: pkg.package_root,
    type: pkg.dependency_type,
    isUsed: pkg.is_used,
    transformedCodeSize: pkg.size,
    files,
  }
}

export function getPackageMeta(reader: RolldownEventsReader): PackageMeta {
  if (!reader.manager.packageGraphReady) {
    return {
      isSupported: false,
      packages: [],
    }
  }

  const packagesMap = getPackagesManifest(reader)
  const packages = Array.from<PackageInfo>(packagesMap.values())
  const packageNameGroups = new Map<string, PackageInfo[]>()

  for (const item of packages) {
    const items = packageNameGroups.get(item.name) ?? []
    items.push(item)
    packageNameGroups.set(item.name, items)
  }

  return {
    isSupported: true,
    packages: packages.map((item) => {
      const sameNamePackages = packageNameGroups.get(item.name) ?? []
      const duplicated = sameNamePackages.length > 1
        && sameNamePackages.some(pkg => pkg.version !== item.version || pkg.dir !== item.dir || pkg.id !== item.id)

      return {
        ...item,
        duplicated,
      }
    }),
  }
}

export const rolldownGetPackages = defineRpcFunction({
  name: 'vite:rolldown:get-packages',
  type: 'query',
  jsonSerializable: true,
  cacheable: true,
  setup: (context) => {
    const manager = getLogsManager(context)
    return {
      handler: async ({ session }: { session: string }) => {
        const reader = await manager.loadPackageSession(session)
        return getPackageMeta(reader)
      },
    }
  },
})
