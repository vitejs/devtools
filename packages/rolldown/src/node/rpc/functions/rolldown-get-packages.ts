import type { PackageInfo } from '../../../shared/types'
import type { RolldownEventsReader } from '../../rolldown/events-reader'
import { readProjectManifestOnly } from '@pnpm/read-project-manifest'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getPackageDirPath, isNodeModulePath } from '../../../shared/utils/filepath'
import { getLogsManager } from '../utils'

type ProjectManifest = Awaited<ReturnType<typeof readProjectManifestOnly>>

function createPackageManifestReader() {
  const manifestCache = new Map<string, Promise<ProjectManifest | null>>()

  return (dir: string) => {
    let promise = manifestCache.get(dir)
    if (!promise) {
      promise = readProjectManifestOnly(dir).catch((err: any) => {
        if (err?.code === 'ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND') {
          return null
        }
        throw err
      })
      manifestCache.set(dir, promise)
    }
    return promise
  }
}

export async function getPackagesManifest(
  reader: RolldownEventsReader,
  readPackageManifest: (dir: string) => Promise<ProjectManifest | null> = createPackageManifestReader(),
) {
  const modulesMap = reader.manager.modules
  const chunks = Array.from(reader.manager.chunks.values())
  const packagesMap = new Map<string, PackageInfo>()
  const packageImportersMap = new Map<string, string[]>()

  const packageModules = chunks.flatMap(chunk => chunk.modules).filter(isNodeModulePath).map((path) => {
    const moduleBuildMetrics = modulesMap.get(path)?.build_metrics
    return {
      path,
      dir: getPackageDirPath(path),
      transformedCodeSize: moduleBuildMetrics?.transforms[moduleBuildMetrics.transforms.length - 1]?.transformed_code_size ?? 0,
    }
  })

  const packageModulePaths = new Map<string, Set<string>>()
  for (const item of packageModules) {
    let paths = packageModulePaths.get(item.dir)
    if (!paths) {
      paths = new Set()
      packageModulePaths.set(item.dir, paths)
    }
    paths.add(item.path)
  }

  const getPackageImporters = (packageDir: string): string[] => {
    const cached = packageImportersMap.get(packageDir)
    if (cached)
      return cached

    const importers = new Set<string>()
    for (const path of packageModulePaths.get(packageDir) ?? []) {
      for (const importer of modulesMap.get(path)?.importers ?? []) {
        if (importer.startsWith(packageDir))
          continue

        if (modulesMap.get(importer)?.imports?.some(i => getPackageDirPath(i.module_id) === packageDir))
          importers.add(importer)
      }
    }

    const result = Array.from(importers).sort((a, b) => a.localeCompare(b))
    packageImportersMap.set(packageDir, result)
    return result
  }

  const manifests = await Promise.all(packageModules.map(async item => ({
    item,
    manifest: await readPackageManifest(item.dir),
  })))

  for (const { item, manifest } of manifests) {
    const packageKey = manifest ? `${manifest.name!}@${manifest.version!}` : `${item.dir}`
    const packageInfo = packagesMap.get(packageKey)
    const importers = packageInfo
      ? []
      : getPackageImporters(item.dir).map(path => ({ path, version: '' }))
    const file = {
      path: item.path,
      transformedCodeSize: item.transformedCodeSize,
      importers,
    }

    if (packageInfo) {
      packageInfo.files.push(file)
      packageInfo.transformedCodeSize += item.transformedCodeSize
      continue
    }

    packagesMap.set(packageKey, {
      name: manifest?.name || item.dir,
      version: manifest?.version || '(unknown)',
      dir: item.dir,
      files: [file],
      transformedCodeSize: item.transformedCodeSize,
    })
  }
  return packagesMap
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
        const modulesMap = reader.manager.modules
        const packageNameCounts = new Map<string, number>()
        const readPackageManifest = createPackageManifestReader()
        const packagesMap = await getPackagesManifest(reader, readPackageManifest)
        const packages = Array.from<PackageInfo>(packagesMap.values())

        for (const item of packages) {
          packageNameCounts.set(item.name, (packageNameCounts.get(item.name) ?? 0) + 1)
        }

        const normalizedPackages = await Promise.all(packages.map(async (item) => {
          const duplicated = (packageNameCounts.get(item.name) ?? 0) > 1
          const files = duplicated
            ? await Promise.all(item.files.map(async (file) => {
                const importers = await Promise.all(file.importers.map(async (importer) => {
                  if (!isNodeModulePath(importer.path))
                    return importer

                  const manifest = await readPackageManifest(getPackageDirPath(importer.path))
                  return { ...importer, version: manifest?.version ?? '' }
                }))
                return { ...file, importers }
              }))
            : item.files

          return {
            ...item,
            duplicated,
            files,
            type: item.files.some(f => modulesMap.get(f.path)?.importers?.some(i => i.includes(reader.meta!.cwd))) ? 'direct' : 'transitive',
          }
        }))
        return normalizedPackages.filter(i => !!i.transformedCodeSize)
      },
    }
  },
})
