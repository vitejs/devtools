import { defineRpcFunction } from '@vitejs/devtools-kit'

export const messagesRemove = defineRpcFunction({
  name: 'devtoolskit:internal:messages:remove',
  type: 'action',
  setup: (context) => {
    return {
      async handler(id: string): Promise<void> {
        await context.messages.remove(id)
      },
    }
  },
})
