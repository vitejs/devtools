import type { WaitBuildResult } from '../../rolldown/build-runner'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { waitForBuild } from '../../rolldown/build-runner'

export const rolldownWaitForBuild = defineRpcFunction({
  name: 'vite:rolldown:wait-for-build',
  type: 'action',
  setup: () => {
    return {
      handler: (): Promise<WaitBuildResult> => waitForBuild(),
    }
  },
})
