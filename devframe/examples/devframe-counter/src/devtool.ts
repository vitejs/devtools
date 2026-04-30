import process from 'node:process'
import { defineDevtool, defineRpcFunction } from 'devframe'
import * as v from 'valibot'

let counter = 0
let watchInterval: ReturnType<typeof setInterval> | undefined

export default defineDevtool({
  id: 'devframe-counter',
  name: 'Devframe Counter',
  icon: 'ph:counter-duotone',
  async setup(ctx) {
    // Static snapshot — included in the static-build dump.
    ctx.rpc.register(defineRpcFunction({
      name: 'devframe-counter:get',
      type: 'static',
      handler: () => ({ count: counter }),
    }))

    // Action with valibot-validated input.
    ctx.rpc.register(defineRpcFunction({
      name: 'devframe-counter:increment',
      type: 'action',
      args: [v.object({ by: v.optional(v.number()) })],
      handler: ({ by = 1 }: { by?: number }) => {
        counter += by
        return { count: counter }
      },
    }))

    // Reactive shared state — clients see updates live via WS.
    const state = await ctx.rpc.sharedState.get(
      'devframe-counter:value' as any,
      { initialValue: { count: counter } as any },
    )

    // File-watch-style auto-increment — the inspector-shape tick source
    // that validates the shared-state broadcast path end-to-end.
    if (ctx.mode === 'dev') {
      watchInterval = setInterval(() => {
        counter += 1
        state.mutate((draft: any) => {
          draft.count = counter
        })
      }, 5000)
    }

    ctx.docks.register({
      id: 'devframe-counter',
      title: 'Counter',
      icon: 'ph:counter-duotone',
      type: 'iframe',
      url: '/devframe-counter/',
    })
  },

  // Browser-only setup for the SPA adapter — in-browser RPC handler so
  // the deployed static SPA can answer `devframe-counter:get` without a
  // server. (Stub until the SPA adapter lands.)
  setupBrowser() {
    // no-op placeholder
  },

  cli: {
    command: 'devframe-counter',
    port: 9999,
  },
  spa: {
    loader: 'query',
  },
})

// Graceful shutdown so nodemon / parent processes don't hang.
process.on('beforeExit', () => {
  if (watchInterval)
    clearInterval(watchInterval)
})
