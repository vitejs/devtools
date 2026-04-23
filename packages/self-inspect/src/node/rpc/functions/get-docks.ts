import { defineRpcFunction } from '@vitejs/devtools-kit'

export const getDocks = defineRpcFunction({
  name: 'devtoolskit:self-inspect:get-docks',
  type: 'query',
  agent: {
    description: 'List every UI dock/panel registered on the devtools. Each entry includes id, title, icon, category, and how the dock is rendered (iframe, action, custom-render, launcher). Read-only.',
    title: 'List docks',
  },
  setup: (context) => {
    return {
      handler: async () => {
        return context.docks.values()
      },
    }
  },
})
