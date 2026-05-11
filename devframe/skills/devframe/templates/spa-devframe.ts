// Devframe with setupBrowser + SPA query-loader — deployable as a static site.
// When mounted into Vite DevTools via `createPluginFromDevframe`, the kit
// auto-derives an iframe dock from `id` / `name` / `icon`.
import { defineDevframe, defineRpcFunction } from 'devframe'
import * as v from 'valibot'

export default defineDevframe({
  id: 'my-inspector',
  name: 'My Inspector',
  icon: 'ph:magnifying-glass-duotone',
  setup(ctx) {
    ctx.rpc.register(defineRpcFunction({
      name: 'my-inspector:analyze',
      type: 'query',
      args: [v.object({ url: v.string() })],
      handler: async ({ url }: { url: string }) => {
        // Server-side implementation (used by CLI/build adapters).
        return { url, verdict: 'ok' as const }
      },
    }))
  },
  setupBrowser() {
    // Browser-side implementation — used by the SPA adapter so the
    // deployed static site can answer RPC without a server.
    // (Wire up an in-browser handler here once the SPA adapter lands.)
  },
  spa: { loader: 'query' },
})
