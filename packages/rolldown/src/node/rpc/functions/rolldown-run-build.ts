import type { RunBuildResult } from '../../rolldown/build-runner'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { startBuild } from '../../rolldown/build-runner'

export const rolldownRunBuild = defineRpcFunction({
  name: 'vite:rolldown:run-build',
  type: 'action',
  setup: (context) => {
    return {
      handler: (): Promise<RunBuildResult> => startBuild(context),
    }
  },
})
