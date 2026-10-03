import { defineRpcFunction } from '@vitejs/devtools-kit'

export const commandsExecute = defineRpcFunction({
  name: 'devtoolskit:internal:commands:execute',
  type: 'action',
  setup: (context) => {
    return {
      async handler(id: string, ...args: any[]) {
        return context.commands.execute(id, ...args)
      },
    }
  },
})
