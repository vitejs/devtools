// Devtool with setupBrowser + SPA query-loader — deployable as a static site.
import { defineDevtool, defineRpcFunction } from 'devframe'
import * as v from 'valibot'

export default defineDevtool({
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
    ctx.docks.register({
      id: 'my-inspector',
      title: 'My Inspector',
      icon: 'ph:magnifying-glass-duotone',
      type: 'iframe',
      url: '/my-inspector/',
    })
  },
  setupBrowser() {
    // Browser-side implementation — used by the SPA adapter so the
    // deployed static site can answer RPC without a server.
    // (Wire up an in-browser handler here once the SPA adapter lands.)
  },
  spa: { loader: 'query' },
})
