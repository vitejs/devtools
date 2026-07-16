import { defineRpcFunction } from '@vitejs/devtools-kit'

/**
 * Interim, Vite-side dock-activation bridge.
 *
 * A mounted plugin iframe (e.g. the Rolldown analyzer) has no direct handle on
 * the host shell's active dock — that selection is client-local state. This RPC
 * lets any client ask the shell to activate another dock by broadcasting the
 * `vite:devtools:activate-dock` client function, which the shell handles by
 * calling `switchEntry`.
 *
 * `sessionId` is carried through for a future upstream `@devframes/*` capability
 * that focuses a specific terminal session; today the shell only switches docks.
 */
export const navigate = defineRpcFunction({
  name: 'devtoolskit:internal:navigate',
  type: 'action',
  setup: (context) => {
    return {
      async handler(options: { dockId: string, sessionId?: string }): Promise<void> {
        context.rpc.broadcast({
          method: 'vite:devtools:activate-dock',
          args: [options],
        })
      },
    }
  },
})
