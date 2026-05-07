import { defineRpcFunction } from '@vitejs/devtools-kit'

export const commandsList = defineRpcFunction({
  name: 'devtoolskit:internal:commands:list',
  type: 'static',
  jsonSerializable: true,
  setup: (context) => {
    return {
      async handler() {
        return context.commands.list()
      },
    }
  },
})
