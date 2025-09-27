import type { PackageInfo } from '~~/shared/types'
import { readProjectManifestOnly } from '@pnpm/read-project-manifest'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getPackageDirPath, isNodeModulePath } from '~~/shared/utils/filepath'
import { getLogsManager } from '../utils'

export const rolldownGetPackages = defineRpcFunction({
  name: 'vite:rolldown:get-packages',
  type: 'query',
  setup: (context) => {
    const manager = getLogsManager(context)
    return {
      handler: async ({ session }: { session: string }) => {
        const reader = await manager.loadSession(session)
        const chunks = Array.from(reader.manager.chunks.values())
        const modulesMap = reader.manager.modules
        const duplicatePackagesMap = new Map<string, number>()
        const packagesManifest = new Map<string, PackageInfo>()
        const packages = chunks.map(chunk => chunk.modules.map(module => module)).flat().filter(isNodeModulePath).map((p) => {
          const module = modulesMap.get(p)
          const moduleBuildMetrics = module?.build_metrics
          return {
            path: p,
            dir: getPackageDirPath(p),
            transformedCodeSize: moduleBuildMetrics?.transforms[moduleBuildMetrics?.transforms.length - 1]?.transformed_code_size ?? 0,
          }
        })
        await Promise.all(packages.map(async (p) => {
          const manifest = await readProjectManifestOnly(p.dir)
          const packageKey = `${manifest.name!}@${manifest.version!}`
          const packageInfo = packagesManifest.get(packageKey)
          const module = modulesMap.get(p.path)
          if (packageInfo) {
            packagesManifest.set(packageKey, {
              ...packageInfo,
              files: [...packageInfo.files, {
                path: p.path,
                transformedCodeSize: p.transformedCodeSize,
                importers: module?.importers ?? [],
              }],
              transformedCodeSize: packageInfo.transformedCodeSize + p.transformedCodeSize,
            })
          }
          else {
            packagesManifest.set(packageKey, {
              name: manifest.name!,
              version: manifest.version!,
              dir: p.dir,
              files: [{
                path: p.path,
                transformedCodeSize: p.transformedCodeSize,
                importers: module?.importers ?? [],
              }],
              transformedCodeSize: p.transformedCodeSize,
            })
          }
        }))
        return Array.from<PackageInfo>(packagesManifest.values())
          .map((p) => {
            duplicatePackagesMap.set(p.name, (duplicatePackagesMap.get(p.name) ?? 0) + 1)
            return {
              ...p,
              type: p.files.some(f => modulesMap.get(f.path)?.importers?.some(i => i.includes(reader.meta!.cwd))) ? 'direct' : 'transitive',
            }
          })
          .map((p) => {
            const duplicated = duplicatePackagesMap.get(p.name)!
            return {
              ...p,
              duplicated: duplicated > 1,
            }
          })
          .filter(i => !!i.transformedCodeSize)
      },
    }
  },
})
