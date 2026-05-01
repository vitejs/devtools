import { defineRpcFunction } from '@vitejs/devtools-kit'

export const messagesClear = defineRpcFunction({
  name: 'devtoolskit:internal:messages:clear',
  type: 'action',
  setup: (context) => {
    return {
      async handler(): Promise<void> {
        await context.messages.clear()
      },
    }
  },
})
