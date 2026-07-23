import { defineRpcFunction } from '@vitejs/devtools-kit'

export interface RolldownProjectInfo {
  cwd: string
  root: string
}

export const rolldownGetProjectInfo = defineRpcFunction({
  name: 'vite:rolldown:get-project-info',
  type: 'query',
  jsonSerializable: true,
  cacheable: true,
  setup: (context) => {
    return {
      handler: async (): Promise<RolldownProjectInfo> => ({
        cwd: context.cwd,
        root: context.workspaceRoot,
      }),
    }
  },
})
