import { defineRpcFunction } from '@vitejs/devtools-kit'

export const logsClear = defineRpcFunction({
  name: 'devtoolskit:internal:logs:clear',
  type: 'action',
  setup: (context) => {
    return {
      async handler(): Promise<void> {
        await context.logs.clear()
      },
    }
  },
})
