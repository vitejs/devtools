import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getLogsManager } from '../utils'
import { getPackagesManifest } from './rolldown-get-packages'

export const rolldownGetPackageDetails = defineRpcFunction({
  name: 'vite:rolldown:get-package-details',
  type: 'query',
  setup: (context) => {
    const manager = getLogsManager(context)
    return {
      handler: async ({ session, id }: { session: string, id: string }) => {
        const reader = await manager.loadSession(session)
        const packagesManifest = await getPackagesManifest(reader)
        return packagesManifest.get(id)
      },
    }
  },
})
