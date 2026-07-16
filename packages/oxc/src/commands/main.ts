import { define } from 'gunshi'
import { createDevServer } from 'devframe/adapters/dev'
import { oxcDevframe, OXC_DEVTOOLS_BASE } from '../node/devframe'

export const mainCommand = define({
  name: 'main',
  description: 'Start oxc-devtools ui',
  run: async () => {
    // Spin up the devframe-powered dev server (h3 + WebSocket RPC + the SPA).
    // We drive it directly from gunshi rather than devframe's `createCli` so the
    // CLI shell stays framework-agnostic.
    await createDevServer(oxcDevframe, {
      onReady: ({ origin }) => {
        console.log(`Oxc Inspector UI is running on ${origin}${OXC_DEVTOOLS_BASE}`)
      },
    })
  },
})
