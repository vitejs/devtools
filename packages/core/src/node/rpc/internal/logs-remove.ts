import { defineRpcFunction } from '@vitejs/devtools-kit'

export const logsRemove = defineRpcFunction({
  name: 'devtoolskit:internal:logs:remove',
  type: 'action',
  setup: (context) => {
    return {
      async handler(id: string): Promise<void> {
        await context.logs.remove(id)
      },
    }
  },
})
