import type { DevToolsChildProcessExecuteOptions } from '@vitejs/devtools-kit'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getBuildCommand } from '../../rolldown/build-runner'

export const rolldownGetBuildCommand = defineRpcFunction({
  name: 'vite:rolldown:get-build-command',
  type: 'query',
  setup: (context) => {
    return {
      handler: async (): Promise<DevToolsChildProcessExecuteOptions> => getBuildCommand(context),
    }
  },
})
