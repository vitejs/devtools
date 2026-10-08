import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getLogsManager } from '../utils'
import { getPackagesManifest } from './rolldown-get-packages'

export const rolldownGetPackageDetails = defineRpcFunction({
  name: 'vite:rolldown:get-package-details',
  type: 'query',
  jsonSerializable: true,
  cacheable: true,
  dump: async (context) => {
    const manager = getLogsManager(context)
    const sessions = await manager.list()
    const inputs: [{ session: string, id: string }][] = []
    for (const session of sessions) {
      const reader = await manager.loadPackageSession(session.id)
      for (const id of getPackagesManifest(reader).keys())
        inputs.push([{ session: session.id, id }])
    }
    return { inputs }
  },
  setup: (context) => {
    const manager = getLogsManager(context)
    return {
      handler: async ({ session, id }: { session: string, id: string }) => {
        const reader = await manager.loadPackageSession(session)
        const packagesManifest = await getPackagesManifest(reader)
        return packagesManifest.get(id)
      },
    }
  },
})
